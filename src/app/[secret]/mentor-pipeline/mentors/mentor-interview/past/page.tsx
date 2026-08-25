import { fetchAllRecords, getField } from "@/lib/airtable";
import PastClient from "./PastClient";

const MENTOR_PIPELINE_BASE = "appFavjto15k519od";
const MENTOR_INFO_TABLE = "tblt4vfMm1tiywIeQ";
// Table the "Send Contract" flow (api/mentor-contract) writes into — separate from the
// Mentor Info intake form above. An entry here means a contract has been sent.
const CONTRACT_TABLE = "tblubNgMLWtH4pzGf";
const MENTOR_INTERVIEW_EVENT_TYPE_ID = 5275411;

export type ContractStatusTone = "not-sent" | "pending" | "sent" | "completed";

export interface ContractStatusInfo {
  label: string;
  tone: ContractStatusTone;
}

export interface PastInterview {
  uid: string;
  mentorName: string;
  mentorEmail: string;
  hostName: string;
  bookingStart: string;
  contractStatus: ContractStatusInfo;
  rate: string | null;
}

export interface PastSection {
  tone: ContractStatusTone;
  title: string;
  interviews: PastInterview[];
}

// Section order + titles the Past tab is grouped into. "pending" (case 4 — an Info entry but
// no Interview/Contract entry) keeps its per-row raw label since it varies row to row; the
// other three have one fixed label per section, shown once in the header instead of per row.
const SECTION_TITLES: Record<ContractStatusTone, string> = {
  "not-sent": "Contract Not Sent",
  "pending": "Awaiting Contract",
  "sent": "Contact Information Missing from Interview Table",
  "completed": "Contract Complete",
};

const SECTION_ORDER: ContractStatusTone[] = ["not-sent", "pending", "sent", "completed"];

// Status is derived purely from where the mentor's email shows up, not from a manually-set
// field (that field lives on a different table than the one "Send Contract" writes to, so it
// can't be trusted to reflect what actually happened):
//   1. no Contract entry, no Info entry  -> "Contract Not Sent"
//   2. Contract entry,    no Info entry  -> "Contract Sent"
//   3. Contract entry,    Info entry     -> "Completed"
//   4. no Contract entry, Info entry     -> whatever the Info record's own "Contract Status" says
function resolveContractStatus(
  hasContract: boolean,
  hasInfo: boolean,
  rawInfoStatus: string | string[] | null
): ContractStatusInfo {
  if (hasContract && hasInfo) return { label: "Completed", tone: "completed" };
  if (hasContract && !hasInfo) return { label: "Contract Sent", tone: "sent" };
  if (!hasContract && hasInfo) {
    const raw = formatRawStatus(rawInfoStatus);
    return raw ? { label: raw, tone: "pending" } : { label: "Contract Not Sent", tone: "not-sent" };
  }
  return { label: "Contract Not Sent", tone: "not-sent" };
}

// The "Contract Status" field has been observed as a single value; guard against a
// multi-select shape too so this never throws regardless of the field's actual type.
function formatRawStatus(raw: string | string[] | null): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? raw.join(", ") : null;
  return raw.trim() || null;
}

async function fetchAllPastBookings() {
  const take = 100;
  const all: { uid: string; attendeeEmail: string; attendeeName: string; hostName: string; start: string }[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(MENTOR_INTERVIEW_EVENT_TYPE_ID),
      status: "past",
      take: String(take),
      skip: String((page - 1) * take),
      sortStart: "desc",
    });

    const res = await fetch(`https://api.cal.com/v2/bookings?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
        "cal-api-version": "2026-02-25",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) break;

    const json = await res.json();
    for (const b of json.data ?? []) {
      const email = b.attendees?.[0]?.email ?? "";
      if (email) {
        all.push({
          uid: b.uid,
          attendeeEmail: email.toLowerCase().trim(),
          attendeeName: b.attendees?.[0]?.name ?? "—",
          hostName: b.hosts?.[0]?.name ?? "—",
          start: b.start,
        });
      }
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function PastPage() {
  const [infoRecords, contractRecords, bookings] = await Promise.all([
    fetchAllRecords(MENTOR_PIPELINE_BASE, MENTOR_INFO_TABLE, {
      fields: ["Full Name", "Email ID", "Contract Status", "Interview Date"],
    }),
    fetchAllRecords(MENTOR_PIPELINE_BASE, CONTRACT_TABLE, {
      fields: ["Email ID", "Name", "Rate"],
    }),
    fetchAllPastBookings(),
  ]);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  const infoByEmail = new Map<string, typeof infoRecords[number]>();
  for (const r of infoRecords) {
    const email = normalize(getField<string>(r, "Email ID") ?? "");
    if (email) infoByEmail.set(email, r);
  }

  const contractByEmail = new Map<string, typeof contractRecords[number]>();
  for (const r of contractRecords) {
    const email = normalize(getField<string>(r, "Email ID") ?? "");
    if (email) contractByEmail.set(email, r);
  }

  const interviews: PastInterview[] = bookings.map((b) => {
    const email = normalize(b.attendeeEmail);
    const infoRecord = infoByEmail.get(email);
    const contractRecord = contractByEmail.get(email);

    const mentorName =
      (infoRecord && getField<string>(infoRecord, "Full Name")) ||
      (contractRecord && getField<string>(contractRecord, "Name")) ||
      b.attendeeName;

    const rawInfoStatus = infoRecord ? getField<string | string[]>(infoRecord, "Contract Status") : null;
    const rate = contractRecord ? getField<string>(contractRecord, "Rate") : null;

    return {
      uid: b.uid,
      mentorName,
      mentorEmail: b.attendeeEmail,
      hostName: b.hostName,
      bookingStart: b.start,
      contractStatus: resolveContractStatus(!!contractRecord, !!infoRecord, rawInfoStatus),
      rate,
    };
  });

  const sections: PastSection[] = SECTION_ORDER.map((tone) => ({
    tone,
    title: SECTION_TITLES[tone],
    interviews: interviews.filter((i) => i.contractStatus.tone === tone),
  }));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {interviews.length} past interview{interviews.length !== 1 ? "s" : ""}
      </p>
      <PastClient sections={sections} />
    </div>
  );
}

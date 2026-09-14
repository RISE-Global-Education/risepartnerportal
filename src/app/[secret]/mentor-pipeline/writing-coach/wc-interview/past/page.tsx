import { fetchAllRecords, getField } from "@/lib/airtable";
import PastWCClient from "./PastWCClient";

const WC_PIPELINE_BASE = "appFavjto15k519od";
const WC_INTERVIEW_EVENT_TYPE_ID = 5631903;
// "WC Interest Form" — the initial intake/eligibility form, checked here for its own "R2
// Status" field (analog of Mentor Info's "Contract Status" on the mentor Past tab).
const WC_INTEREST_TABLE = "tblb9IgCjQh288AVG";
// "Mentor Interview" table — the table the "Send Contract" flow (api/wc-contract) writes
// Rate/Name/Interview Date into. Shared with the mentor pipeline (api/mentor-contract writes
// here too); an entry here (with a Rate) means a contract has been sent.
const CONTRACT_TABLE = "tblubNgMLWtH4pzGf";

export type ContractStatusTone = "not-sent" | "pending" | "sent" | "completed";

export interface ContractStatusInfo {
  label: string;
  tone: ContractStatusTone;
}

export interface PastWCBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  university: string | null;
  academicBackground: string | null;
  hostName: string;
  start: string;
  contractStatus: ContractStatusInfo;
  rate: string | null;
  hasApplication: boolean;
}

export interface PastWCSection {
  tone: ContractStatusTone;
  title: string;
  bookings: PastWCBooking[];
}

// Same section grouping as the mentor Past tab. "pending" (case 4 — an Interest-form entry but
// no Contract entry) keeps its per-row raw label since it varies row to row; the other three
// have one fixed label per section, shown once in the header instead of per row.
const SECTION_TITLES: Record<ContractStatusTone, string> = {
  "not-sent": "Contract Not Sent",
  "pending": "Awaiting Contract",
  "sent": "Contact Information Missing from Interview Table",
  "completed": "Contract Complete",
};

const SECTION_ORDER: ContractStatusTone[] = ["not-sent", "pending", "sent", "completed"];

// Same derivation as the mentor Past tab, using the WC Interest form's own "R2 Status" field
// in place of Mentor Info's "Contract Status":
//   1. no Contract entry, no Interest-form entry  -> "Contract Not Sent"
//   2. Contract entry,    no Interest-form entry  -> "Contract Sent"
//   3. Contract entry,    Interest-form entry     -> "Completed"
//   4. no Contract entry, Interest-form entry     -> whatever the Interest form's "R2 Status" says
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

// "R2 Status" has been observed as a single value; guard against a multi-select shape too so
// this never throws regardless of the field's actual type.
function formatRawStatus(raw: string | string[] | null): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? raw.join(", ") : null;
  return raw.trim() || null;
}

type RawBooking = Omit<PastWCBooking, "contractStatus" | "rate" | "hasApplication">;

async function fetchAllPast(): Promise<RawBooking[]> {
  const take = 100;
  const all: RawBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(WC_INTERVIEW_EVENT_TYPE_ID),
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
      const fields = b.bookingFieldsResponses ?? {};
      all.push({
        uid: b.uid,
        attendeeName: b.attendees?.[0]?.name ?? "—",
        attendeeEmail: b.attendees?.[0]?.email ?? "—",
        attendeePhone: fields.attendeePhoneNumber ?? null,
        university: fields.University ?? null,
        academicBackground: fields["Academic-Background"] ?? null,
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
      });
    }

    const oldest = json.data?.[json.data.length - 1]?.start;
    if (oldest) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      if (new Date(oldest) < cutoff) break;
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function PastWCPage() {
  const [bookings, interestRecords, contractRecords] = await Promise.all([
    fetchAllPast(),
    fetchAllRecords(WC_PIPELINE_BASE, WC_INTEREST_TABLE, {
      fields: ["Email ID", "R2 Status"],
    }),
    fetchAllRecords(WC_PIPELINE_BASE, CONTRACT_TABLE, {
      fields: ["Email ID", "Rate"],
    }),
  ]);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  const interestByEmail = new Map<string, typeof interestRecords[number]>();
  for (const r of interestRecords) {
    const email = normalize(getField<string>(r, "Email ID") ?? "");
    if (email) interestByEmail.set(email, r);
  }

  const contractByEmail = new Map<string, typeof contractRecords[number]>();
  for (const r of contractRecords) {
    const email = normalize(getField<string>(r, "Email ID") ?? "");
    if (email) contractByEmail.set(email, r);
  }

  const enriched: PastWCBooking[] = bookings.map((b) => {
    const email = normalize(b.attendeeEmail);
    const interestRecord = interestByEmail.get(email);
    const contractRecord = contractByEmail.get(email);

    const rawInfoStatus = interestRecord ? getField<string | string[]>(interestRecord, "R2 Status") : null;
    const rate = contractRecord ? getField<string>(contractRecord, "Rate") : null;

    return {
      ...b,
      contractStatus: resolveContractStatus(!!contractRecord, !!interestRecord, rawInfoStatus),
      rate,
      hasApplication: !!interestRecord,
    };
  });

  const sections: PastWCSection[] = SECTION_ORDER.map((tone) => ({
    tone,
    title: SECTION_TITLES[tone],
    bookings: enriched.filter((b) => b.contractStatus.tone === tone),
  }));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {enriched.length} past writing coach interview{enriched.length !== 1 ? "s" : ""}
      </p>
      <PastWCClient sections={sections} />
    </div>
  );
}

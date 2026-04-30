import { fetchAllRecords, getField } from "@/lib/airtable";
import PastClient from "./PastClient";

const MENTOR_PIPELINE_BASE = "appFavjto15k519od";
const MENTOR_INFO_TABLE = "tblt4vfMm1tiywIeQ";
const MENTOR_INTERVIEW_EVENT_TYPE_ID = 5275411;
const UNDERTAKING_FIELD = "Please upload a signed copy of the mentor undertaking shared with you. (File type - PDF, max size - 2MB)";

export type ContractStatusLabel = "Send Contract" | "Contract Sent" | "Contract Not Sent" | "Not Needed" | "Completed";

export interface MatchedMentor {
  uid: string;
  mentorName: string;
  mentorEmail: string;
  hostName: string;
  interviewDate: string | null;
  bookingStart: string;
  contractStatus: ContractStatusLabel;
  undertakingUploaded: boolean;
}

export interface UnmatchedMentor {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  bookingStart: string;
}

const NOT_NEEDED = new Set(["Rejected", "Sent (Issue)", "Not Interested", "Removed"]);

function resolveContractStatus(raw: string[] | null): ContractStatusLabel {
  if (!raw || raw.length === 0) return "Contract Not Sent";
  if (raw.includes("Completed")) return "Completed";
  if (raw.includes("Send Contract")) return "Send Contract";
  if (raw.includes("Sent")) return "Contract Sent";
  if (raw.some((s) => NOT_NEEDED.has(s))) return "Not Needed";
  return "Contract Not Sent";
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
  const [records, bookings] = await Promise.all([
    fetchAllRecords(MENTOR_PIPELINE_BASE, MENTOR_INFO_TABLE, {
      fields: ["Full Name", "Email ID", "Contract Status", "Interview Date", UNDERTAKING_FIELD],
    }),
    fetchAllPastBookings(),
  ]);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  const recordByEmail = new Map<string, typeof records[number]>();
  for (const r of records) {
    const email = normalize(getField<string>(r, "Email ID") ?? "");
    if (email) recordByEmail.set(email, r);
  }

  const matched: MatchedMentor[] = [];
  const unmatched: UnmatchedMentor[] = [];

  for (const b of bookings) {
    const record = recordByEmail.get(normalize(b.attendeeEmail));
    if (record) {
      const rawStatus = getField<string[]>(record, "Contract Status");
      const undertaking = getField<{ url: string }[]>(record, UNDERTAKING_FIELD);
      matched.push({
        uid: b.uid,
        mentorName: getField<string>(record, "Full Name") ?? "—",
        mentorEmail: b.attendeeEmail,
        hostName: b.hostName,
        interviewDate: getField<string>(record, "Interview Date"),
        bookingStart: b.start,
        contractStatus: resolveContractStatus(rawStatus),
        undertakingUploaded: Array.isArray(undertaking) && undertaking.length > 0,
      });
    } else {
      unmatched.push({
        uid: b.uid,
        attendeeName: b.attendeeName,
        attendeeEmail: b.attendeeEmail,
        hostName: b.hostName,
        bookingStart: b.start,
      });
    }
  }

  const STATUS_ORDER: Record<ContractStatusLabel, number> = {
    "Contract Not Sent": 0,
    "Send Contract": 1,
    "Contract Sent": 2,
    "Not Needed": 3,
    "Completed": 4,
  };

  matched.sort((a, b) => STATUS_ORDER[a.contractStatus] - STATUS_ORDER[b.contractStatus]);

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {matched.length} matched interview{matched.length !== 1 ? "s" : ""}
        {unmatched.length > 0 && (
          <>, <span className="text-rise-black font-medium">{unmatched.length}</span> not in pipeline</>
        )}
      </p>
      <PastClient matched={matched} unmatched={unmatched} />
    </div>
  );
}

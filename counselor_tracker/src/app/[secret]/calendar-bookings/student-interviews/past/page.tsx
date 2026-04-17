import { fetchAllRecords, getField } from "@/lib/airtable";
import PastClient from "./PastClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const RESEARCH_SCHOLAR_TABLE = "tblpsa6QdGW9qmyll";
const STUDENT_INTERVIEW_EVENT_TYPE_ID = 5205635;

export interface MatchedRow {
  uid: string;
  applicantId: string;
  studentName: string;
  hostName: string;
  acceptanceSent: boolean;
  start: string;
}

export interface UnmatchedRow {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
}

async function fetchAllPastBookings() {
  const take = 100;
  const all: {
    uid: string;
    attendeeEmail: string;
    attendeeName: string;
    hostName: string;
    start: string;
  }[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(STUDENT_INTERVIEW_EVENT_TYPE_ID),
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
    fetchAllRecords(STUDENT_PIPELINE_BASE, RESEARCH_SCHOLAR_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Parent Email ID", "Acceptances Email Sent Time"],
    }),
    fetchAllPastBookings(),
  ]);

  // Build email → Airtable record map (student email and parent email both)
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  const recordByEmail = new Map<string, typeof records[number]>();
  for (const r of records) {
    const studentEmail = normalize(getField<string>(r, "Student Email ID") ?? "");
    const parentEmail = normalize(getField<string>(r, "Parent Email ID") ?? "");
    if (studentEmail) recordByEmail.set(studentEmail, r);
    if (parentEmail && !recordByEmail.has(parentEmail)) recordByEmail.set(parentEmail, r);
  }

  const matchedRaw: MatchedRow[] = [];
  const unmatched: UnmatchedRow[] = [];

  for (const b of bookings) {
    const record = recordByEmail.get(normalize(b.attendeeEmail));
    if (record) {
      const acceptanceTime = getField<string>(record, "Acceptances Email Sent Time");
      matchedRaw.push({
        uid: b.uid,
        applicantId: getField<string>(record, "Applicant ID") ?? "—",
        studentName: getField<string>(record, "Name") ?? "—",
        hostName: b.hostName,
        acceptanceSent: !!acceptanceTime,
        start: b.start,
      });
    } else {
      unmatched.push({
        uid: b.uid,
        attendeeName: b.attendeeName,
        attendeeEmail: b.attendeeEmail,
        hostName: b.hostName,
        start: b.start,
      });
    }
  }

  // Sort: No (acceptance not sent) first, then descending by start time within each group
  const matched = matchedRaw.sort((a, b) => {
    if (!a.acceptanceSent && b.acceptanceSent) return -1;
    if (a.acceptanceSent && !b.acceptanceSent) return 1;
    return b.start.localeCompare(a.start);
  });

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

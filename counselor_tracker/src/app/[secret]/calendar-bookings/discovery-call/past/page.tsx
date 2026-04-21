import PastClient from "./PastClient";
import { fetchAllRecords, getField } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const DISCOVERY_EVENT_TYPE_ID = 4654239;

export interface DiscoveryBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
}

export interface MatchedBooking {
  uid: string;
  applicantId: string;
  studentName: string;
  studentEmail: string;
  parentName: string;
  parentEmail: string;
  hostName: string;
  start: string;
  hasNotes: boolean;
}

async function fetchAllBookings(): Promise<DiscoveryBooking[]> {
  const take = 100;
  const all: DiscoveryBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(DISCOVERY_EVENT_TYPE_ID),
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
      all.push({
        uid: b.uid,
        attendeeName: b.attendees?.[0]?.name ?? "—",
        attendeeEmail: (b.attendees?.[0]?.email ?? "").toLowerCase().trim(),
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
      });
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function PastPage() {
  const [bookings, records] = await Promise.all([
    fetchAllBookings(),
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Applicant ID", "Student Name", "Student Email ID", "Parent/Guardian Name", "Parent Email ID", "Notes"],
    }),
  ]);

  const recordByEmail = new Map<string, { applicantId: string; studentName: string; studentEmail: string; parentName: string; parentEmail: string; hasNotes: boolean }>();
  for (const r of records) {
    const studentEmail = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
    const parentEmail = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
    const entry = {
      applicantId: getField<string>(r, "Applicant ID") ?? "—",
      studentName: getField<string>(r, "Student Name") ?? "—",
      studentEmail: getField<string>(r, "Student Email ID") ?? "",
      parentName: getField<string>(r, "Parent/Guardian Name") ?? "—",
      parentEmail: getField<string>(r, "Parent Email ID") ?? "",
      hasNotes: !!(getField<string>(r, "Notes") ?? "").trim(),
    };
    if (studentEmail) recordByEmail.set(studentEmail, entry);
    if (parentEmail && !recordByEmail.has(parentEmail)) recordByEmail.set(parentEmail, entry);
  }

  const matched: MatchedBooking[] = [];
  const unmatched: DiscoveryBooking[] = [];

  for (const b of bookings) {
    const airtable = recordByEmail.get(b.attendeeEmail);
    if (airtable) {
      matched.push({
        uid: b.uid,
        applicantId: airtable.applicantId,
        studentName: airtable.studentName,
        studentEmail: airtable.studentEmail,
        parentName: airtable.parentName,
        parentEmail: airtable.parentEmail,
        hostName: b.hostName,
        start: b.start,
        hasNotes: airtable.hasNotes,
      });
    } else {
      unmatched.push(b);
    }
  }

  // No-notes rows first
  matched.sort((a, b) => {
    if (!a.hasNotes && b.hasNotes) return -1;
    if (a.hasNotes && !b.hasNotes) return 1;
    return 0;
  });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} past discovery call{bookings.length !== 1 ? "s" : ""} —{" "}
        <span className="text-rise-black font-medium">{matched.length}</span> matched,{" "}
        <span className="text-rise-black font-medium">{unmatched.length}</span> unmatched
      </p>
      <PastClient matched={matched} unmatched={unmatched} />
    </div>
  );
}

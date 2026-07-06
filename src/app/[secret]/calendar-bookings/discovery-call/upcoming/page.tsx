import UpcomingClient from "./UpcomingClient";
import { fetchAllRecords, getField } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const DISCOVERY_EVENT_TYPE_IDS = [4654239, 6083591];

export interface DiscoveryBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
  meetingUrl: string;
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
  meetingUrl: string;
}

async function fetchAllBookings(): Promise<DiscoveryBooking[]> {
  const take = 100;
  const all: DiscoveryBooking[] = [];
  const seenUids = new Set<string>();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeIds: DISCOVERY_EVENT_TYPE_IDS.join(","),
      status: "upcoming",
      take: String(take),
      skip: String((page - 1) * take),
      sortStart: "asc",
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
    const data = json.data ?? [];
    for (const b of data) {
      // Offset pagination can shift between page requests (e.g. ties on
      // `start`), which can surface the same booking on consecutive pages.
      if (seenUids.has(b.uid)) continue;
      seenUids.add(b.uid);
      all.push({
        uid: b.uid,
        attendeeName: b.attendees?.[0]?.name ?? "—",
        attendeeEmail: (b.attendees?.[0]?.email ?? "").toLowerCase().trim(),
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
        meetingUrl: b.meetingUrl ?? "",
      });
    }

    // Cal.com's `pagination.hasNextPage` can report true even on the last page,
    // so use the page size instead to detect the end.
    hasMore = data.length === take;
    page++;
  }

  return all;
}

export default async function UpcomingPage() {
  const [bookings, records] = await Promise.all([
    fetchAllBookings(),
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Applicant ID", "Student Name", "Student Email ID", "Parent/Guardian Name", "Parent Email ID"],
    }),
  ]);

  // Build email → airtable record map
  const recordByEmail = new Map<string, { applicantId: string; studentName: string; studentEmail: string; parentName: string; parentEmail: string }>();
  for (const r of records) {
    const studentEmail = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
    const parentEmail = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
    const entry = {
      applicantId: getField<string>(r, "Applicant ID") ?? "—",
      studentName: getField<string>(r, "Student Name") ?? "—",
      studentEmail: getField<string>(r, "Student Email ID") ?? "",
      parentName: getField<string>(r, "Parent/Guardian Name") ?? "—",
      parentEmail: getField<string>(r, "Parent Email ID") ?? "",
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
        meetingUrl: b.meetingUrl,
      });
    } else {
      unmatched.push(b);
    }
  }

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} upcoming discovery call{bookings.length !== 1 ? "s" : ""} —{" "}
        <span className="text-rise-black font-medium">{matched.length}</span> matched,{" "}
        <span className="text-rise-black font-medium">{unmatched.length}</span> unmatched
      </p>
      <UpcomingClient matched={matched} unmatched={unmatched} />
    </div>
  );
}

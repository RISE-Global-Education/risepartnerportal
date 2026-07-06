import { fetchAllRecords, getField } from "@/lib/airtable";
import UnqualifiedClient from "./UnqualifiedClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const DISCOVERY_EVENT_TYPE_IDS = [4654239, 6083591];

export interface UnqualifiedRow {
  recordId: string;
  studentName: string;
  studentEmail: string;
  parentName: string;
  parentEmail: string;
  // populated if a Cal.com booking matched
  bookingUid: string | null;
  bookingStart: string | null;
  hostName: string | null;
}

async function fetchAllUpcomingBookings() {
  const take = 100;
  const all: { uid: string; attendeeEmail: string; start: string; hostName: string }[] = [];
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
      const email = b.attendees?.[0]?.email ?? "";
      if (email) all.push({ uid: b.uid, attendeeEmail: email.toLowerCase().trim(), start: b.start, hostName: b.hosts?.[0]?.name ?? "—" });
    }

    // Cal.com's `pagination.hasNextPage` can report true even on the last page,
    // so use the page size instead to detect the end.
    hasMore = data.length === take;
    page++;
  }

  return all;
}

export default async function UnqualifiedPage() {
  const [records, bookings] = await Promise.all([
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      filterByFormula: `{Qualified} = "No"`,
      fields: ["Student Name", "Student Email ID", "Parent/Guardian Name", "Parent Email ID"],
    }),
    fetchAllUpcomingBookings(),
  ]);

  // Build a map: email → booking for fast lookup
  const bookingByEmail = new Map<string, { uid: string; start: string; hostName: string }>();
  for (const b of bookings) {
    if (!bookingByEmail.has(b.attendeeEmail)) {
      bookingByEmail.set(b.attendeeEmail, { uid: b.uid, start: b.start, hostName: b.hostName });
    }
  }

  const rows: UnqualifiedRow[] = records.map((r) => {
    const studentEmail = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
    const parentEmail = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();

    const match = bookingByEmail.get(studentEmail) ?? bookingByEmail.get(parentEmail) ?? null;

    return {
      recordId: r.id,
      studentName: getField<string>(r, "Student Name") ?? "—",
      studentEmail: getField<string>(r, "Student Email ID") ?? "",
      parentName: getField<string>(r, "Parent/Guardian Name") ?? "",
      parentEmail: getField<string>(r, "Parent Email ID") ?? "",
      bookingUid: match?.uid ?? null,
      bookingStart: match?.start ?? null,
      hostName: match?.hostName ?? null,
    };
  });

  // Sort: rows with a booking first
  rows.sort((a, b) => {
    if (a.bookingUid && !b.bookingUid) return -1;
    if (!a.bookingUid && b.bookingUid) return 1;
    if (a.bookingStart && b.bookingStart) return a.bookingStart.localeCompare(b.bookingStart);
    return 0;
  });

  const withBooking = rows.filter((r) => r.bookingUid).length;

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {rows.length} unqualified record{rows.length !== 1 ? "s" : ""} —{" "}
        <span className="text-rise-black font-medium">{withBooking}</span> with an upcoming booking
      </p>
      <UnqualifiedClient rows={rows} />
    </div>
  );
}

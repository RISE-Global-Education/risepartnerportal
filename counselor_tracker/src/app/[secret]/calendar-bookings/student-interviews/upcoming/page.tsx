import UpcomingClient from "./UpcomingClient";

export interface StudentInterviewBooking {
  uid: string;
  studentName: string;
  studentEmail: string;
  hostName: string;
  start: string;
}

async function fetchAllUpcoming(): Promise<StudentInterviewBooking[]> {
  const CALCOM_API = "https://api.cal.com/v2";
  const STUDENT_INTERVIEW_EVENT_TYPE_ID = 5205635;
  const take = 100;
  const all: StudentInterviewBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(STUDENT_INTERVIEW_EVENT_TYPE_ID),
      status: "upcoming",
      take: String(take),
      skip: String((page - 1) * take),
      sortStart: "asc",
    });

    const res = await fetch(`${CALCOM_API}/bookings?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
        "cal-api-version": "2026-02-25",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) break;

    const json = await res.json();
    const bookings = json.data ?? [];

    for (const b of bookings) {
      all.push({
        uid: b.uid,
        studentName: b.attendees?.[0]?.name ?? "—",
        studentEmail: b.attendees?.[0]?.email ?? "—",
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
      });
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function UpcomingPage() {
  const bookings = await fetchAllUpcoming();

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} upcoming student interview{bookings.length !== 1 ? "s" : ""}
      </p>
      <UpcomingClient bookings={bookings} />
    </div>
  );
}

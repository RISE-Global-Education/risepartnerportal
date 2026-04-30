import UpcomingClient from "./UpcomingClient";

const MENTOR_INTERVIEW_EVENT_TYPE_ID = 5275411;

export interface MentorInterviewBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  university: string | null;
  hostName: string;
  start: string;
}

async function fetchAllUpcoming(): Promise<MentorInterviewBooking[]> {
  const take = 100;
  const all: MentorInterviewBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(MENTOR_INTERVIEW_EVENT_TYPE_ID),
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
    for (const b of json.data ?? []) {
      const fields = b.bookingFieldsResponses ?? {};
      all.push({
        uid: b.uid,
        attendeeName: b.attendees?.[0]?.name ?? "—",
        attendeeEmail: b.attendees?.[0]?.email ?? "—",
        attendeePhone: fields.attendeePhoneNumber ?? null,
        university: fields.University ?? null,
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
        {bookings.length} upcoming mentor interview{bookings.length !== 1 ? "s" : ""}
      </p>
      <UpcomingClient bookings={bookings} />
    </div>
  );
}

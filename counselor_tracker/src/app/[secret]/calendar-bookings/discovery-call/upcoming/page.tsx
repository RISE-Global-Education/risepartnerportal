import UpcomingClient from "./UpcomingClient";

export interface DiscoveryBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
  meetingUrl: string;
}

async function fetchAllBookings(): Promise<DiscoveryBooking[]> {
  const CALCOM_API = "https://api.cal.com/v2";
  const DISCOVERY_EVENT_TYPE_ID = 4654239;
  const take = 100;
  const allBookings: DiscoveryBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(DISCOVERY_EVENT_TYPE_ID),
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
      allBookings.push({
        uid: b.uid,
        attendeeName: b.attendees?.[0]?.name ?? "—",
        attendeeEmail: b.attendees?.[0]?.email ?? "—",
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
        meetingUrl: b.meetingUrl ?? "",
      });
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return allBookings;
}

export default async function UpcomingPage() {
  const bookings = await fetchAllBookings();

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} upcoming discovery call{bookings.length !== 1 ? "s" : ""}
      </p>
      <UpcomingClient bookings={bookings} />
    </div>
  );
}

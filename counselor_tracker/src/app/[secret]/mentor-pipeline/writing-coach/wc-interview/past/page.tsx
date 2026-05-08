import PastWCClient from "./PastWCClient";

const WC_INTERVIEW_EVENT_TYPE_ID = 5631903;

export interface PastWCBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  university: string | null;
  academicBackground: string | null;
  hostName: string;
  start: string;
}

async function fetchAllPast(): Promise<PastWCBooking[]> {
  const take = 100;
  const all: PastWCBooking[] = [];
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
  const bookings = await fetchAllPast();

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} past writing coach interview{bookings.length !== 1 ? "s" : ""}
      </p>
      <PastWCClient bookings={bookings} />
    </div>
  );
}

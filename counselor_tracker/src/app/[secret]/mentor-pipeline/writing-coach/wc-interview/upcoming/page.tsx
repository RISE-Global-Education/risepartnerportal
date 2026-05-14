import UpcomingWCClient from "./UpcomingWCClient";

const WC_INTERVIEW_EVENT_TYPE_ID = 5631903;

export interface WCInterviewBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  university: string | null;
  academicBackground: string | null;
  hostName: string;
  start: string;
}

async function fetchWCEmails(): Promise<string[]> {
  const emails: string[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/appFavjto15k519od/tblb9IgCjQh288AVG?${params}`,
      {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) break;

    const json = await res.json();
    for (const record of json.records ?? []) {
      const email = record.fields["Email ID"];
      if (email) emails.push((email as string).toLowerCase());
    }

    offset = json.offset;
  } while (offset);

  return emails;
}

async function fetchAllUpcoming(): Promise<WCInterviewBooking[]> {
  const take = 100;
  const all: WCInterviewBooking[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(WC_INTERVIEW_EVENT_TYPE_ID),
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
        academicBackground: fields["Academic-Background"] ?? null,
        hostName: b.hosts?.[0]?.name ?? "—",
        start: b.start,
      });
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function UpcomingWCPage() {
  const [bookings, wcEmails] = await Promise.all([fetchAllUpcoming(), fetchWCEmails()]);

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {bookings.length} upcoming writing coach interview{bookings.length !== 1 ? "s" : ""}
      </p>
      <UpcomingWCClient bookings={bookings} wcEmails={wcEmails} />
    </div>
  );
}

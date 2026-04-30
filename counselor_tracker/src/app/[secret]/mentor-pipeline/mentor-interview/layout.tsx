import MeetingsChart from "@/app/[secret]/calendar-bookings/MeetingsChart";
import MentorInterviewSubTabNav from "./SubTabNav";

const MENTOR_INTERVIEW_EVENT_TYPE_ID = 5275411;

async function fetchStarts(status: "past" | "upcoming"): Promise<string[]> {
  const take = 100;
  const starts: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(MENTOR_INTERVIEW_EVENT_TYPE_ID),
      status,
      take: String(take),
      skip: String((page - 1) * take),
      sortStart: status === "past" ? "desc" : "asc",
    });

    const res = await fetch(`https://api.cal.com/v2/bookings?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
        "cal-api-version": "2026-02-25",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) break;

    const json = await res.json();
    for (const b of json.data ?? []) {
      if (b.start) starts.push(b.start);
    }

    if (status === "past") {
      const oldest = json.data?.[json.data.length - 1]?.start;
      if (oldest) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        if (new Date(oldest) < cutoff) break;
      }
    } else {
      const latest = json.data?.[json.data.length - 1]?.start;
      if (latest) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 7);
        if (new Date(latest) > cutoff) break;
      }
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return starts;
}

export default async function MentorInterviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const [pastStarts, upcomingStarts] = await Promise.all([
    fetchStarts("past"),
    fetchStarts("upcoming"),
  ]);

  return (
    <div>
      <MeetingsChart pastStarts={pastStarts} upcomingStarts={upcomingStarts} />
      <MentorInterviewSubTabNav secret={secret} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

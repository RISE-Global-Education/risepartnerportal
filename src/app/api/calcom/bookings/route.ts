import { NextRequest, NextResponse } from "next/server";

const CALCOM_API = "https://api.cal.com/v2";
const DISCOVERY_EVENT_TYPE_ID = 4654239;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const take = 100;
  const skip = (page - 1) * take;

  const params = new URLSearchParams({
    eventTypeId: String(DISCOVERY_EVENT_TYPE_ID),
    status: "upcoming",
    take: String(take),
    skip: String(skip),
    sortStart: "asc",
  });

  const res = await fetch(`${CALCOM_API}/bookings?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      "cal-api-version": "2026-02-25",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

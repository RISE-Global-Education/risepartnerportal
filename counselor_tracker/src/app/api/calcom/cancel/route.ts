import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { uid, cancellationReason } = await req.json();

  if (!uid) {
    return NextResponse.json({ error: "Missing booking uid" }, { status: 400 });
  }

  const res = await fetch(`https://api.cal.com/v2/bookings/${uid}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      "cal-api-version": "2026-02-25",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancellationReason: cancellationReason ?? "" }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message ?? "Failed to cancel" }, { status: res.status });
  }

  return NextResponse.json(data);
}

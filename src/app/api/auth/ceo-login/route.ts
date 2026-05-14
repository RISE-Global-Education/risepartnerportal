import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { secret, password } = await req.json();

  if (
    secret !== process.env.DASHBOARD_SECRET ||
    password !== process.env.DASHBOARD_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ceo_auth", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 7-day session
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

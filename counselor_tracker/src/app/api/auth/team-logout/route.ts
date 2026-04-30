import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clearOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set("team_auth", "", clearOpts);
  res.cookies.set("team_employee_types", "", clearOpts);
  return res;
}

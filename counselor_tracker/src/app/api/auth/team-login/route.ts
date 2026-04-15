import { NextRequest, NextResponse } from "next/server";

const CONTACTS_BASE = "appNF0vZQGLNucTck";
const TEAM_TABLE    = "tbltkz5mwNDjR3a6w";

export async function POST(req: NextRequest) {
  const { secret, email, password } = await req.json();

  if (secret !== process.env.USER_SECRET) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Fetch team records from Airtable
  const url = `https://api.airtable.com/v0/${CONTACTS_BASE}/${TEAM_TABLE}?fields%5B%5D=Email&fields%5B%5D=Password&fields%5B%5D=Name&fields%5B%5D=Working+Status`;
  const atRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    cache: "no-store",
  });

  if (!atRes.ok) {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 502 });
  }

  const data = await atRes.json();
  const records: { fields: Record<string, string> }[] = data.records ?? [];

  const match = records.find((r) => {
    const rowEmail = (r.fields["Email"] ?? "").toLowerCase().trim();
    const rowPassword = r.fields["Password"] ?? "";
    return rowEmail === email.toLowerCase().trim() && rowPassword === password;
  });

  if (!match) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const name = match.fields["Name"] ?? "Team Member";

  const res = NextResponse.json({ ok: true, name });
  res.cookies.set("team_auth", name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12-hour session
  });
  return res;
}

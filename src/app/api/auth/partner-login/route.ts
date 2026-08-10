import { NextRequest, NextResponse } from "next/server";
import { getCounselorBySlug } from "@/lib/counselors";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json();

  const result = await getCounselorBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { counselor } = result;

  if (!counselor.partnerPassword) {
    return NextResponse.json({ error: "No password has been set yet." }, { status: 409 });
  }

  if (password !== counselor.partnerPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const existing = req.cookies.get("partner_auth")?.value ?? "";
  const ids = new Set(existing.split(",").filter(Boolean));
  ids.add(counselor.counselorId);
  res.cookies.set("partner_auth", Array.from(ids).join(","), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 24-hour session
    maxAge: 60 * 60 * 24,
  });
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { getCounselorBySlug } from "@/lib/counselors";
import { updateRecord } from "@/lib/airtable";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

function addAuthCookie(res: NextResponse, req: NextRequest, counselorId: string) {
  const existing = req.cookies.get("partner_auth")?.value ?? "";
  const ids = new Set(existing.split(",").filter(Boolean));
  ids.add(counselorId);
  res.cookies.set("partner_auth", Array.from(ids).join(","), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 24-hour session
    maxAge: 60 * 60 * 24,
  });
}

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const result = await getCounselorBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { counselor } = result;
  if (counselor.partnerPassword) {
    return NextResponse.json(
      { error: "A password has already been set for this partner. Please log in instead." },
      { status: 409 }
    );
  }

  await updateRecord(
    COUNSELOR_DB_BASE,
    COUNSELOR_DB_TABLE,
    counselor.id,
    { "Partner Password": password },
    process.env.AIRTABLE_COUNSELOR_TOKEN
  );

  const res = NextResponse.json({ ok: true });
  addAuthCookie(res, req, counselor.counselorId);
  return res;
}

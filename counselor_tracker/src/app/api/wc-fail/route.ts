import { NextRequest, NextResponse } from "next/server";

const BASE = "appFavjto15k519od";
const WC_INTEREST_TABLE = "tblb9IgCjQh288AVG";
const WC_INTEREST_URL = `https://api.airtable.com/v0/${BASE}/${WC_INTEREST_TABLE}`;

export async function POST(req: NextRequest) {
  const { email, reason } = await req.json();
  if (!email || !reason) {
    return NextResponse.json({ error: "email and reason required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    filterByFormula: `{Email ID} = "${email.toLowerCase().trim()}"`,
    maxRecords: "1",
  });
  const findRes = await fetch(`${WC_INTEREST_URL}?${params}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!findRes.ok) return NextResponse.json({ error: "Airtable lookup failed" }, { status: 502 });

  const findData = await findRes.json();
  const record = findData.records?.[0];
  if (!record) return NextResponse.json({ ok: true, skippedAirtable: true });

  const patchRes = await fetch(`${WC_INTEREST_URL}/${record.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        "R2 Status": "Fail",
        "R2 Notes": reason,
      },
    }),
  });

  if (!patchRes.ok) return NextResponse.json({ error: "Airtable update failed" }, { status: 502 });

  return NextResponse.json({ ok: true });
}

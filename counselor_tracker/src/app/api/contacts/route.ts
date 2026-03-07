import { NextRequest, NextResponse } from "next/server";
import { createRecord, updateRecord } from "@/lib/airtable";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const CONTACTS_TABLE = "tbl6kgEdDr0C3lib4";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, contacts } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array is required" }, { status: 400 });
  }

  const token = process.env.AIRTABLE_COUNSELOR_TOKEN;
  const results = [];

  for (const contact of contacts) {
    const { name, email, position, eFname, outreachOptIn, companyName, counselorId, index } = contact;
    const leadId = `${companyName} — ${counselorId} — ${index}`;

    if (!name) continue;

    const fields: Record<string, unknown> = {
      Name: name,
      "Lead ID": leadId,
      "Email Opt-in": outreachOptIn !== false ? "Yes" : "No",
    };

    if (email) fields["Email"] = email;
    if (position) fields["Position"] = position;
    if (eFname) fields["E_FNAME"] = eFname;

    const record = await createRecord(COUNSELOR_DB_BASE, CONTACTS_TABLE, fields, token);
    results.push(record);
  }

  return NextResponse.json({ success: true, records: results });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { secret, recordId, fields } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId || !fields || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "recordId and fields are required" }, { status: 400 });
  }

  const token = process.env.AIRTABLE_COUNSELOR_TOKEN;
  const record = await updateRecord(COUNSELOR_DB_BASE, CONTACTS_TABLE, recordId, fields, token);
  return NextResponse.json({ success: true, record });
}

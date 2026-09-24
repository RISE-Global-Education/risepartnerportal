import { NextRequest, NextResponse } from "next/server";
import { mutate } from "@/lib/lms-db";
import { COUNSELOR_CONTACTS as CT, COUNSELORS } from "@/lib/supabase-schema";

// Contacts live in Supabase only — nothing here ever reaches Airtable (see
// supabase-schema.ts). counselor_id is a direct column, so there's no
// separate "link to counselor" step the way Airtable's POC array field
// needed; the relationship is set once, at insert time.

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, contacts } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array is required" }, { status: 400 });
  }

  const results = [];

  for (const contact of contacts) {
    const { name, email, phone, position, eFname, outreachOptIn, companyName, counselorId, index } = contact;
    if (!name) continue;

    const leadId = `${companyName} — ${counselorId} — ${index}`;

    const [row] = await mutate<{ id: string }>(
      `INSERT INTO ${CT.table}
         (${CT.airtableRecordId}, ${CT.counselorId}, ${CT.counselerUuid}, ${CT.leadId},
          ${CT.name}, ${CT.email}, ${CT.phoneNumber}, ${CT.position}, ${CT.firstName}, ${CT.emailOptIn})
       VALUES
         ('native:' || gen_random_uuid(), $1,
          (SELECT ${COUNSELORS.counselerUuid} FROM ${COUNSELORS.table} WHERE ${COUNSELORS.id} = $1),
          $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${CT.id}::text AS id`,
      [
        counselorId, leadId, name,
        email || null, phone || null, position || null, eFname || null,
        outreachOptIn !== false,
      ]
    );
    results.push(row);
  }

  return NextResponse.json({ success: true, records: results });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { secret, recordId, name, email, phone, position, eFname, outreachOptIn } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  function set(column: string, value: unknown) {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }

  if (name !== undefined) set(CT.name, name);
  if (email !== undefined) set(CT.email, email || null);
  if (phone !== undefined) set(CT.phoneNumber, phone || null);
  if (position !== undefined) set(CT.position, position || null);
  if (eFname !== undefined) set(CT.firstName, eFname || null);
  if (outreachOptIn !== undefined) set(CT.emailOptIn, outreachOptIn !== false);

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  params.push(recordId);
  const [row] = await mutate(
    `UPDATE ${CT.table} SET ${sets.join(", ")} WHERE ${CT.id}::text = $${params.length} RETURNING *`,
    params
  );

  return NextResponse.json({ success: true, record: row });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { secret, recordId } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }

  await mutate(`DELETE FROM ${CT.table} WHERE ${CT.id}::text = $1`, [recordId]);

  return NextResponse.json({ success: true });
}

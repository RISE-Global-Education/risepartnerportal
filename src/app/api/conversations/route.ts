import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";
import { mutate } from "@/lib/lms-db";
import { COUNSELOR_CONVERSATIONS as CC, COUNSELORS } from "@/lib/supabase-schema";

// Conversations live in Supabase only — nothing here ever reaches Airtable
// (see supabase-schema.ts). counselor_id is the counselor's PR business
// code directly, not an Airtable linked-record id, so no separate lookup
// table is needed to resolve it the way Discovery Calls/Applications did.

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, counselorId, counselorName, date, notes, attendee, intent } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!counselorId || !notes || !intent) {
    return NextResponse.json(
      { error: "counselorId, notes, and intent are required" },
      { status: 400 }
    );
  }

  const intentLabel = intent.charAt(0).toUpperCase() + intent.slice(1);
  const formattedNotes = `${intentLabel}\nNotes: ${notes}`;
  const conversationDate = date || new Date().toISOString();

  const counselorRows = await mutate<{ counseler_uuid: string | null; airtable_record_id: string | null }>(
    `SELECT ${COUNSELORS.counselerUuid} AS counseler_uuid, ${COUNSELORS.airtableRecordId} AS airtable_record_id
       FROM ${COUNSELORS.table} WHERE ${COUNSELORS.id} = $1`,
    [counselorId]
  );
  const counselor = counselorRows[0];

  const [row] = await mutate<{ id: string }>(
    `INSERT INTO ${CC.table}
       (${CC.airtableRecordId}, ${CC.counselorId}, ${CC.counselerUuid}, ${CC.title}, ${CC.date}, ${CC.attendee}, ${CC.notes})
     VALUES ('native:' || gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     RETURNING ${CC.id}::text AS id`,
    [
      counselorId, counselor?.counseler_uuid || null,
      `Meeting - ${counselorName || "Unknown"}`, conversationDate,
      attendee || null, formattedNotes,
    ]
  );

  // Keep the counselor's last-conversation signal current in both stores —
  // Supabase directly, and Airtable too since Counselors is the one entity
  // that still syncs there. Skipped if the counselor has no real Airtable
  // record yet (still holding its creation placeholder — see
  // api/counselors/route.ts) rather than sending Airtable a bad update.
  await mutate(
    `UPDATE ${COUNSELORS.table} SET ${COUNSELORS.lastConversationDate} = $1 WHERE ${COUNSELORS.id} = $2`,
    [conversationDate, counselorId]
  );
  if (counselor?.airtable_record_id?.startsWith("rec")) {
    await updateRecord(
      COUNSELOR_DB_BASE,
      COUNSELOR_DB_TABLE,
      counselor.airtable_record_id,
      { "Last Conversation Date": conversationDate },
      process.env.AIRTABLE_COUNSELOR_TOKEN
    );
  }

  return NextResponse.json({ success: true, record: row });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { secret, recordId, date, notes, attendee } = body;

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

  if (date !== undefined) set(CC.date, date);
  if (notes !== undefined) set(CC.notes, notes);
  if (attendee !== undefined) set(CC.attendee, attendee || null);

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  params.push(recordId);
  const [row] = await mutate(
    `UPDATE ${CC.table} SET ${sets.join(", ")} WHERE ${CC.id}::text = $${params.length} RETURNING *`,
    params
  );

  return NextResponse.json({ success: true, record: row });
}

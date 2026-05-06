import { NextRequest, NextResponse } from "next/server";
import { createRecord, updateRecord } from "@/lib/airtable";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const CONVERSATIONS_TABLE = "tblIg6bBDbLvsvPiJ";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, counselorId, counselorName, date, notes, attendee } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!counselorId || !notes) {
    return NextResponse.json(
      { error: "counselorId and notes are required" },
      { status: 400 }
    );
  }

  const fields: Record<string, unknown> = {
    Title: `Meeting - ${counselorName || "Unknown"}`,
    Counselor: [counselorId],
    Notes: notes,
  };

  if (date) {
    fields.Date = date;
  }

  if (attendee) {
    fields.Attendee = attendee;
  }

  const token = process.env.AIRTABLE_COUNSELOR_TOKEN;
  const record = await createRecord(
    COUNSELOR_DB_BASE,
    CONVERSATIONS_TABLE,
    fields,
    token
  );

  await updateRecord(
    COUNSELOR_DB_BASE,
    COUNSELOR_DB_TABLE,
    counselorId,
    { "Last Conversation Date": date || new Date().toISOString() },
    token
  );

  return NextResponse.json({ success: true, record });
}

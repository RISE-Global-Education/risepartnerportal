import { NextRequest, NextResponse } from "next/server";
import { getRecord, updateRecord } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const RESEARCH_SCHOLAR_TABLE = "tblpsa6QdGW9qmyll";

export async function POST(req: NextRequest) {
  const { recordId, note, pocName } = await req.json();

  if (!recordId || !note?.trim() || !pocName?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const record = await getRecord(STUDENT_PIPELINE_BASE, RESEARCH_SCHOLAR_TABLE, recordId);
    const existing = ((record.fields?.["Interview POC Notes"] as string) ?? "").trim();
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const newEntry = `${pocName.trim()}, ${date}: ${note.trim()}`;
    const updated = existing ? `${existing}\n${newEntry}` : newEntry;

    await updateRecord(STUDENT_PIPELINE_BASE, RESEARCH_SCHOLAR_TABLE, recordId, {
      "Interview POC Notes": updated,
    });

    return NextResponse.json({ notes: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Airtable error" }, { status: 502 });
  }
}

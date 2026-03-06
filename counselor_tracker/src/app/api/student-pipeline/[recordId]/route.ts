import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll"; // Research Scholar Application

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const { recordId } = await params;
  const body = await req.json();

  const fields: Record<string, unknown> = {};

  if (body.notes !== undefined) {
    fields["Notes"] = body.notes;
  }
  if (body.interviewDate !== undefined) {
    fields["Interview Date"] = body.interviewDate || null;
  }
  if (body.acceptanceStatus !== undefined) {
    fields["Acceptance Status"] = body.acceptanceStatus;
  }
  if (body.callStatus !== undefined) {
    fields["Call Status"] = body.callStatus || null;
  }
  if (body.followUpStatus !== undefined) {
    fields["Follow Up Status"] = body.followUpStatus;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await updateRecord(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, recordId, fields, process.env.AIRTABLE_COUNSELOR_TOKEN);
    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[student-pipeline PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

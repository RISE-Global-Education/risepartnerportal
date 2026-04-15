import { NextRequest, NextResponse } from "next/server";
import { getRecord, updateRecord } from "@/lib/airtable";

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
  if (body.callNotes !== undefined) {
    fields["Call Notes"] = body.callNotes;
  }
  if (body.shortlistingCallNotes !== undefined) {
    fields["Shortlisting Call Notes"] = body.shortlistingCallNotes;
  }
  if (body.followUpStatus !== undefined) {
    fields["Follow Up Status"] = body.followUpStatus;
  }
  if (body.mentorField !== undefined) {
    fields["Mentor Field"] = body.mentorField;
  }
  if (body.lastCallDate !== undefined) {
    fields["Last Call Date"] = body.lastCallDate || null;
  }
  if (body.paymentCallNotes !== undefined) {
    fields["Payment Call Notes"] = body.paymentCallNotes;
  }
  if (body.outreachNotes2025 !== undefined) {
    fields["2025 Outreach Notes"] = body.outreachNotes2025;
  }
  if (body.outreach2025 !== undefined) {
    fields["2025 Outreach"] = body.outreach2025;
  }
  if (body.callPoc !== undefined) {
    fields["Call POC"] = body.callPoc;
  }
  if (body.interviewPoc !== undefined) {
    fields["Interview POC"] = body.interviewPoc;
  }

  // DNP counter increment: fetch current value then add 1
  if (body.incrementDnp === true) {
    const current = await getRecord(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, recordId, process.env.AIRTABLE_COUNSELOR_TOKEN);
    const currentCount = (current.fields["DNP Counter"] as number) ?? 0;
    fields["DNP Counter"] = currentCount + 1;
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

import { NextRequest, NextResponse } from "next/server";
import { getRecord, updateRecord } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

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
  if (body.callNotes !== undefined) {
    fields["Call Notes"] = body.callNotes;
  }
  if (body.consultationDate !== undefined) {
    fields["Consultation Date"] = body.consultationDate || null;
  }
  if (body.qualified !== undefined) {
    fields["Qualified"] = body.qualified || null;
  }
  if (body.studentApplicationForm !== undefined) {
    fields["Student Application Form"] = body.studentApplicationForm || null;
  }
  if (body.lastContacted !== undefined) {
    fields["Last Call Date"] = body.lastContacted || null;
  }
  if (body.callPoc !== undefined) {
    fields["Call POC"] = body.callPoc;
  }

  // DNP counter increment: fetch current value then add 1
  if (body.incrementDnp === true) {
    const current = await getRecord(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, recordId, process.env.AIRTABLE_COUNSELOR_TOKEN);
    const currentCount = (current.fields["DNP Counter"] as number) ?? 0;
    fields["DNP Counter"] = currentCount + 1;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await updateRecord(
      STUDENT_PIPELINE_BASE,
      DISCOVERY_CALL_TABLE,
      recordId,
      fields,
      process.env.AIRTABLE_COUNSELOR_TOKEN
    );
    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[parent-discovery PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


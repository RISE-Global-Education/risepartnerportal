import { NextRequest, NextResponse } from "next/server";
import { createRecord } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const COUNSELOR_SOURCE_RISE_2025 = "recKsIxtppd8Se1LK";

// POST — create a new Parent Discovery record from a 2025 cohort lead
export async function POST(req: NextRequest) {
  const body = await req.json();

  const fields: Record<string, unknown> = {
    "Student Name": body.studentName,
    "Student Email ID": body.studentEmail,
    "Parent/Guardian Name": body.parentName,
    "Parent Email ID": body.parentEmail,
    "Parent Phone number": body.parentPhone,
    "Current Grade": body.currentGrade === "9" ? "Grade 9" : body.currentGrade,
    "Country of Residence": typeof body.country === "string" ? body.country.trim() : body.country,
    "School/ College Name": body.schoolCollege,
    "Counselor Source": [COUNSELOR_SOURCE_RISE_2025],
  };

  // Strip undefined/empty/null values so Airtable doesn't error on blank fields
  for (const key of Object.keys(fields)) {
    if (fields[key] === undefined || fields[key] === "" || fields[key] === null) {
      delete fields[key];
    }
  }

  try {
    const created = await createRecord(
      STUDENT_PIPELINE_BASE,
      DISCOVERY_CALL_TABLE,
      fields,
      process.env.AIRTABLE_COUNSELOR_TOKEN
    );
    return NextResponse.json({ success: true, record: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[parent-discovery POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

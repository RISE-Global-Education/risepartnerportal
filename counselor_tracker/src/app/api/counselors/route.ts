import { NextRequest, NextResponse } from "next/server";
import { createRecord, updateRecord, fetchAllRecords, getField } from "@/lib/airtable";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

function getToken() {
  return process.env.AIRTABLE_COUNSELOR_TOKEN;
}

async function generateNextCounselorId(): Promise<string> {
  const records = await fetchAllRecords(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, {
    fields: ["Counselor ID"],
  });

  let maxNum = 0;
  for (const record of records) {
    const id = getField<string>(record, "Counselor ID") || "";
    const match = id.match(/^PR(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `PR${maxNum + 1}`;
}

// POST — Create new counselor
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, companyName, firstName, email, country, poc, phone, capacity, scholarshipAmount, referralAmount, counselorId, followUpStatus } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!companyName || !firstName || !email || !country || !poc || poc.length === 0) {
    return NextResponse.json(
      { error: "companyName, firstName, email, country, and poc are required" },
      { status: 400 }
    );
  }

  const finalCounselorId = counselorId || await generateNextCounselorId();

  const fields: Record<string, unknown> = {
    "Company Name": companyName,
    "Counselor ID": finalCounselorId,
    "First Name": firstName,
    "Email ID (s)": email,
    "POC (RISE)": poc,
    "Country": country,
  };

  if (phone) fields["Phone Number"] = phone;
  if (capacity) fields["Expected Number"] = capacity;
  if (scholarshipAmount != null) fields["Scholarship Amount"] = Number(scholarshipAmount);
  if (referralAmount != null) fields["Referral Amount"] = Number(referralAmount) / 100;
  if (followUpStatus) fields["Follow Up Status"] = followUpStatus;

  const record = await createRecord(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, fields, getToken());

  return NextResponse.json({
    success: true,
    record,
    counselorId: finalCounselorId,
    recordId: record.id,
  });
}

// PATCH — Update existing counselor fields
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { secret, recordId, fields } = body;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId || !fields || Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "recordId and fields are required" },
      { status: 400 }
    );
  }

  const record = await updateRecord(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, recordId, fields, getToken());

  return NextResponse.json({ success: true, record });
}

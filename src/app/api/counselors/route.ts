import { NextRequest, NextResponse } from "next/server";
import { createRecord, updateRecord } from "@/lib/airtable";
import { mutate } from "@/lib/lms-db";
import { COUNSELORS } from "@/lib/supabase-schema";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

function getToken() {
  return process.env.AIRTABLE_COUNSELOR_TOKEN;
}

// Counselor creation writes Supabase first (see COUNSELORS.table), then
// Airtable synchronously — AddPartnerForm.tsx immediately follows this call
// with a PATCH (to link POC contacts) and a conversation create, both keyed
// off Airtable's own record id, so that id has to be real by the time this
// responds. Reads still come from Airtable for now (see supabase-schema.ts);
// only creation is Supabase-first, so the next id has to come from there too
// — scanning Airtable here could hand out an id that's already lagging by
// whatever this request itself is about to create.
async function generateNextCounselorId(): Promise<string> {
  const rows = await mutate<{ id: string }>(`SELECT ${COUNSELORS.id} AS id FROM ${COUNSELORS.table}`);

  let maxNum = 0;
  for (const row of rows) {
    const match = row.id.match(/^PR(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `PR${maxNum + 1}`;
}

function toBool(value: unknown): boolean | null {
  if (value === "Yes") return true;
  if (value === "No") return false;
  if (typeof value === "boolean") return value;
  return null;
}

// POST — Create new counselor
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret, companyName, partnerType, workshopType, firstName, email, country, poc, phone, capacity, scholarshipAmount, referralAmount, counselorId, followUpStatus, studentInterview, shareBrochure, sharePayment, studentMixMaxAddin } = body;

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
    "Partner Name": companyName,
    "Counselor ID": finalCounselorId,
    "First Name": firstName,
    "Email ID (s)": email,
    "POC (RISE)": poc,
    "Country": country,
  };

  if (partnerType) fields["Partner Type"] = partnerType;
  if (workshopType) fields["Workshop Type"] = workshopType;

  if (capacity) fields["Expected Number"] = capacity;
  if (scholarshipAmount != null) fields["Scholarship Amount"] = Number(scholarshipAmount);
  if (referralAmount != null) fields["Referral Amount"] = Number(referralAmount) / 100;
  if (followUpStatus) fields["Follow Up Status"] = followUpStatus;
  if (studentInterview) fields["Student Interview"] = studentInterview;
  if (shareBrochure) fields["Share Brochure"] = shareBrochure;
  if (sharePayment) fields["Share Payment"] = sharePayment;
  if (studentMixMaxAddin) fields["Student MixMax Addin"] = studentMixMaxAddin;

  // Supabase first: insert with a temporary placeholder for airtable_record_id
  // (that column is NOT NULL/UNIQUE and Airtable hasn't assigned a real one
  // yet). Placeholder is unique per counselor, so it can never collide.
  const placeholderRecordId = `pending-${finalCounselorId}`;
  await mutate(
    `INSERT INTO ${COUNSELORS.table}
       (${COUNSELORS.id}, ${COUNSELORS.airtableRecordId}, ${COUNSELORS.counselerUuid},
        ${COUNSELORS.companyName}, ${COUNSELORS.email}, ${COUNSELORS.allEmails},
        ${COUNSELORS.country}, ${COUNSELORS.partnerType}, ${COUNSELORS.followUpStatus},
        ${COUNSELORS.scholarshipAmount}, ${COUNSELORS.referralPercentage}, ${COUNSELORS.workshopType},
        ${COUNSELORS.studentInterview}, ${COUNSELORS.shareBrochure}, ${COUNSELORS.sharePayment},
        ${COUNSELORS.studentMixmaxAddin}, ${COUNSELORS.pocRise}, ${COUNSELORS.expectedStudentCount})
     VALUES ($1,$2,gen_random_uuid(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      finalCounselorId, placeholderRecordId,
      companyName, email || null, email ? [email] : null,
      country, partnerType || null, followUpStatus || null,
      scholarshipAmount != null ? Number(scholarshipAmount) : null,
      referralAmount != null ? Number(referralAmount) / 100 : null,
      workshopType || null,
      toBool(studentInterview), toBool(shareBrochure), toBool(sharePayment), toBool(studentMixMaxAddin),
      poc, capacity || null,
    ]
  );

  // Now push to Airtable synchronously — the caller (AddPartnerForm.tsx)
  // immediately follows this response with a PATCH and a conversation create,
  // both keyed off the real Airtable record id.
  let record;
  try {
    record = await createRecord(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, fields, getToken());
  } catch (err) {
    // Airtable push failed — roll back the Supabase row so the two stores
    // never disagree about whether this counselor exists.
    await mutate(`DELETE FROM ${COUNSELORS.table} WHERE ${COUNSELORS.id} = $1`, [finalCounselorId]);
    throw err;
  }

  await mutate(
    `UPDATE ${COUNSELORS.table} SET ${COUNSELORS.airtableRecordId} = $1 WHERE ${COUNSELORS.id} = $2`,
    [record.id, finalCounselorId]
  );

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

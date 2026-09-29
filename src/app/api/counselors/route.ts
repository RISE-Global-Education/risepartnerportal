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

// Maps an Airtable field edit to its Supabase column, applying the same value
// conversions as the create path. Returns null for Airtable-only fields.
function toSupabaseColumn(field: string, value: unknown): { column: string; value: unknown } | null {
  switch (field) {
    case "Partner Name": return { column: COUNSELORS.companyName, value };
    // "Counselor ID" is deliberately not mirrored: it is the primary key that
    // nine tables reference with no ON UPDATE CASCADE, so renaming it needs a
    // dedicated migration, not a plain UPDATE.
    case "Country": return { column: COUNSELORS.country, value: value || null };
    case "Partner Type": return { column: COUNSELORS.partnerType, value: value || null };
    case "Follow Up Status": return { column: COUNSELORS.followUpStatus, value: value || null };
    case "Workshop Type": return { column: COUNSELORS.workshopType, value: value || null };
    case "Expected Number": return { column: COUNSELORS.expectedStudentCount, value: value === "" ? null : value };
    case "POC (RISE)": return { column: COUNSELORS.pocRise, value };
    case "Scholarship Amount":
      return { column: COUNSELORS.scholarshipAmount, value: value == null || value === "" ? null : Number(value) };
    // Callers already send Referral Amount as a fraction (percent / 100).
    case "Referral Amount":
      return { column: COUNSELORS.referralPercentage, value: value == null || value === "" ? null : Number(value) };
    case "Student Interview": return { column: COUNSELORS.studentInterview, value: toBool(value) };
    case "Share Brochure": return { column: COUNSELORS.shareBrochure, value: toBool(value) };
    case "Share Payment": return { column: COUNSELORS.sharePayment, value: toBool(value) };
    case "Student MixMax Addin": return { column: COUNSELORS.studentMixmaxAddin, value: toBool(value) };
    default: return null;
  }
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

  // Mirror the edit into Supabase first, then push to Airtable; if Airtable
  // fails, restore the previous Supabase values so the two stores agree.
  // Fields with no Supabase counterpart are Airtable-only.
  const sets: string[] = [];
  const params: unknown[] = [];
  const columns: string[] = [];
  for (const [name, value] of Object.entries(fields as Record<string, unknown>)) {
    const mapped = toSupabaseColumn(name, value);
    if (!mapped) continue;
    params.push(mapped.value);
    sets.push(`${mapped.column} = $${params.length}`);
    columns.push(mapped.column);
  }

  let previous: Record<string, unknown> | undefined;
  let currentId: string | undefined;
  if (sets.length > 0) {
    [previous] = await mutate<Record<string, unknown>>(
      `SELECT ${COUNSELORS.id}, ${columns.join(", ")} FROM ${COUNSELORS.table} WHERE ${COUNSELORS.airtableRecordId} = $1`,
      [recordId]
    );
    if (previous) {
      currentId = previous[COUNSELORS.id] as string;
      params.push(recordId);
      await mutate(
        `UPDATE ${COUNSELORS.table} SET ${sets.join(", ")} WHERE ${COUNSELORS.airtableRecordId} = $${params.length}`,
        params
      );
    }
  }

  let record;
  try {
    record = await updateRecord(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, recordId, fields, getToken());
  } catch (err) {
    if (previous) {
      const restoreSets = columns.map((c, i) => `${c} = $${i + 1}`);
      const restoreParams = columns.map((c) => previous![c]);
      restoreParams.push(currentId);
      await mutate(
        `UPDATE ${COUNSELORS.table} SET ${restoreSets.join(", ")} WHERE ${COUNSELORS.id} = $${restoreParams.length}`,
        restoreParams
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true, record });
}

import { fetchAllRecords, getField } from "./airtable";
import { billLabelForInstant } from "./bill-id";

// The student table in the RISE LMS Airtable. One row per student, with when they
// were created, the counselor, and that counselor's referral rate. Invoices read
// their student count and referral % from here. A student counts toward the bill
// whose 26th-to-26th period contains their creation time (see billLabelForInstant),
// not toward a calendar month. Every student with a counselor counts.
//
// The table is read directly, NOT through an Airtable view. A view's filter can be
// edited in the Airtable app by anyone, and the view this used to read was an
// email-sending queue (students left it once their email was marked Sent), so
// counts would have shrunk as emails went out.
//
// Where it lives comes only from the environment, with no defaults:
//   AIRTABLE_REFERRAL_BASE_ID, AIRTABLE_REFERRAL_TABLE_ID
// A missing one is an error, not an empty result: the Airtable layer quietly
// returns nothing when it cannot read a base, which would show every bill with 0
// students.
function getReferralSource(): { base: string; table: string } {
  const base = process.env.AIRTABLE_REFERRAL_BASE_ID?.trim();
  const table = process.env.AIRTABLE_REFERRAL_TABLE_ID?.trim();
  if (!base || !table) {
    throw new Error(
      "Referral students are not configured: set AIRTABLE_REFERRAL_BASE_ID and AIRTABLE_REFERRAL_TABLE_ID."
    );
  }
  return { base, table };
}

// Only these fields are requested. The table also holds student contact and
// application details that the partner page has no business pulling in.
const FIELDS = ["Record Created", "Referral %", "Counselor Name"];

export interface ReferralMonthStats {
  studentCount: number;
  referralPercent: number | null; // null when the rate is missing or 0
}

/** Lookup key shared by the stats map and its callers. */
export function referralMonthKey(counselorId: string, month: string): string {
  return `${counselorId.trim().toUpperCase()}|${month.trim().toLowerCase()}`;
}

// A name like "Q&A College Admissions (dash) PR12430" ends with the counselor's ID.
export function parseCounselorId(value: unknown): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== "string") return null;
  const match = /(PR\d+)\s*$/i.exec(text.trim());
  return match ? match[1].toUpperCase() : null;
}

// The lookup arrives as ["10.0%"], or "10.0%", or a number. Returns a percent
// (10 for ten percent), or null for anything missing, unparseable or zero.
export function parseReferralPercent(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  let percent: number;
  if (typeof raw === "number") {
    percent = raw > 0 && raw <= 1 ? raw * 100 : raw;
  } else if (typeof raw === "string") {
    percent = parseFloat(raw.replace("%", ""));
  } else {
    return null;
  }
  if (!Number.isFinite(percent) || percent <= 0) return null;
  return Math.round(percent * 100) / 100;
}

function createdAt(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Student count and referral rate for every (counselor, bill) in the table,
 * keyed by referralMonthKey() with the bill label (such as "November 2026").
 * Rows without a counselor ID or a creation time are skipped.
 */
export async function getReferralMonthStats(): Promise<Map<string, ReferralMonthStats>> {
  const { base, table } = getReferralSource();
  const records = await fetchAllRecords(base, table, { fields: FIELDS });

  const stats = new Map<string, ReferralMonthStats>();
  for (const record of records) {
    const counselorId = parseCounselorId(getField<unknown>(record, "Counselor Name"));
    const created = createdAt(getField<unknown>(record, "Record Created"));
    if (!counselorId || !created) continue;
    const month = billLabelForInstant(created);

    const key = referralMonthKey(counselorId, month);
    const entry = stats.get(key) ?? { studentCount: 0, referralPercent: null };
    entry.studentCount += 1;
    // The rate is the same on every row of a month, but a row can be missing it.
    entry.referralPercent ??= parseReferralPercent(getField<unknown>(record, "Referral %"));
    stats.set(key, entry);
  }
  return stats;
}

/** Every counselor with at least one referred student in the bill's period (a label like "November 2026"). */
export async function getCounselorIdsForMonth(month: string): Promise<string[]> {
  const wanted = month.trim().toLowerCase();
  const ids = new Set<string>();
  for (const key of (await getReferralMonthStats()).keys()) {
    const [counselorId, rowMonth] = key.split("|");
    if (rowMonth === wanted) ids.add(counselorId);
  }
  return [...ids].sort();
}

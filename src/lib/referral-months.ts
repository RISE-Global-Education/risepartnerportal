import { fetchAllRecords, getField } from "./airtable";

// The student view in the RISE LMS Airtable. One row per referred student, with
// the month they came in, the counselor, and that counselor's referral rate for
// the month. Invoices read their student count and referral % from here.
//
// Where it lives comes only from the environment, with no defaults:
//   AIRTABLE_REFERRAL_BASE_ID, AIRTABLE_REFERRAL_TABLE_ID, AIRTABLE_REFERRAL_VIEW_ID
// A missing one is an error, not an empty result: the Airtable layer quietly
// returns nothing when it cannot read a base, and that would show every bill
// with 0 students.
function getReferralSource(): { base: string; table: string; view: string } {
  const base = process.env.AIRTABLE_REFERRAL_BASE_ID?.trim();
  const table = process.env.AIRTABLE_REFERRAL_TABLE_ID?.trim();
  const view = process.env.AIRTABLE_REFERRAL_VIEW_ID?.trim();
  if (!base || !table || !view) {
    throw new Error(
      "The referral view is not configured: set AIRTABLE_REFERRAL_BASE_ID, AIRTABLE_REFERRAL_TABLE_ID and AIRTABLE_REFERRAL_VIEW_ID."
    );
  }
  return { base, table, view };
}

// Only these fields are requested. The table also holds student contact and
// application details that the partner page has no business pulling in.
const FIELDS = ["Month", "Referral %", "Counselor Name"];

export interface ReferralMonthStats {
  studentCount: number;
  referralPercent: number | null; // null when the rate is missing or 0
}

/** Lookup key shared by the stats map and its callers. */
export function referralMonthKey(counselorId: string, month: string): string {
  return `${counselorId.trim().toUpperCase()}|${month.trim().toLowerCase()}`;
}

// "Q&A College Admissions — PR12430" ends with the counselor's ID.
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

function monthText(value: unknown): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/**
 * Student count and referral rate for every (counselor, month) in the view,
 * keyed by referralMonthKey(). Rows without a counselor ID or month are skipped.
 */
export async function getReferralMonthStats(): Promise<Map<string, ReferralMonthStats>> {
  const { base, table, view } = getReferralSource();
  const records = await fetchAllRecords(base, table, { view, fields: FIELDS });

  const stats = new Map<string, ReferralMonthStats>();
  for (const record of records) {
    const counselorId = parseCounselorId(getField<unknown>(record, "Counselor Name"));
    const month = monthText(getField<unknown>(record, "Month"));
    if (!counselorId || !month) continue;

    const key = referralMonthKey(counselorId, month);
    const entry = stats.get(key) ?? { studentCount: 0, referralPercent: null };
    entry.studentCount += 1;
    // The rate is the same on every row of a month, but a row can be missing it.
    entry.referralPercent ??= parseReferralPercent(getField<unknown>(record, "Referral %"));
    stats.set(key, entry);
  }
  return stats;
}

/** Every counselor with at least one referred student in the month (a label like "October 2026"). */
export async function getCounselorIdsForMonth(month: string): Promise<string[]> {
  const wanted = month.trim().toLowerCase();
  const ids = new Set<string>();
  for (const key of (await getReferralMonthStats()).keys()) {
    const [counselorId, rowMonth] = key.split("|");
    if (rowMonth === wanted) ids.add(counselorId);
  }
  return [...ids].sort();
}

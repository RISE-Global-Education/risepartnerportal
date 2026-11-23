import { makeBillId, parseMonthLabel, MONTH_NAMES } from "./bill-id";
import { insertPendingBills } from "./counselor-invoices";
import { getCounselorIdsForMonth } from "./referral-months";

export interface GenerateResult {
  month: string;
  counselors: number;
  created: number;
}

export class InvalidMonthError extends Error {}

/**
 * Creates one Pending bill for every counselor who has referred students in the
 * month. Bills that already exist are skipped, so a repeat run creates nothing.
 */
export async function generateInvoicesForMonth(month: string): Promise<GenerateResult> {
  const parsed = parseMonthLabel(month);
  if (!parsed) {
    throw new InvalidMonthError('Month must look like "October 2026".');
  }
  // Canonical label, so the stored text always matches Airtable's "Month".
  const label = `${MONTH_NAMES[parsed.monthIndex]} ${parsed.year}`;

  const counselorIds = await getCounselorIdsForMonth(label);
  const bills = counselorIds.flatMap((counselorId) => {
    const billId = makeBillId(counselorId, label);
    return billId ? [{ billId, counselorId, billingMonth: label }] : [];
  });

  const created = await insertPendingBills(bills);
  return { month: label, counselors: counselorIds.length, created };
}

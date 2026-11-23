import { mutate, query, toIso, toStr } from "./lms-db";
import { COUNSELOR_INVOICES as CI } from "./supabase-schema";
import { getReferralMonthStats, referralMonthKey } from "./referral-months";

export type InvoiceStatus = "Pending" | "Processing" | "Paid";

// Safe to hand to a client component: it says whether a file exists, never
// which Drive file it is.
export interface CounselorInvoice {
  billId: string;
  counselorId: string;
  billingMonth: string; // e.g. "October 2026"
  studentCount: number; // from the Airtable referral view, by counselor and month
  referralPercent: number | null; // that month's rate, null when missing or 0
  status: InvoiceStatus;
  paidAt: string | null;
  uploaded: boolean;
  fileName: string | null;
  uploadedAt: string | null;
}

// Server-only: the pointer to the file in Drive.
export interface InvoiceFileRef {
  billId: string;
  counselorId: string;
  driveFileId: string;
  fileName: string | null;
}

export interface BillForReconcile {
  id: string;
  billId: string;
  status: InvoiceStatus;
  driveFileId: string | null;
}

export const INVOICES_CACHE_TAG = "counselor-invoices";

export function normalizeStatus(value: unknown): InvoiceStatus {
  return value === "Paid" || value === "Processing" ? value : "Pending";
}

/** Sort key for a label like "October 2026". Unparseable labels sort last. */
export function monthSortValue(label: string): number {
  const time = Date.parse(`1 ${label} UTC`);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/** Bill IDs are compared upper-cased everywhere. */
export function normalizeBillId(value: string): string {
  return value.trim().toUpperCase();
}

export async function getInvoicesForCounselor(counselorId: string): Promise<CounselorInvoice[]> {
  if (!counselorId) return [];

  const [rows, stats] = await Promise.all([
    query<{
      bill_id: string;
      counselor_id: string;
      billing_month: string;
      payment_status: string | null;
      paid_at: unknown;
      uploaded: boolean;
      file_name: string | null;
      uploaded_at: unknown;
    }>(
      INVOICES_CACHE_TAG,
      `SELECT ${CI.billId} AS bill_id, ${CI.counselorId} AS counselor_id,
              ${CI.billingMonth} AS billing_month, ${CI.paymentStatus} AS payment_status,
              ${CI.paidAt} AS paid_at, (${CI.driveFileId} IS NOT NULL) AS uploaded,
              ${CI.fileName} AS file_name, ${CI.uploadedAt} AS uploaded_at
         FROM ${CI.table}
        WHERE ${CI.counselorId} = $1`,
      [counselorId]
    ),
    getReferralMonthStats(),
  ]);

  return rows
    .map((row) => {
      const month = stats.get(referralMonthKey(row.counselor_id, row.billing_month));
      return {
        billId: row.bill_id,
        counselorId: row.counselor_id,
        billingMonth: row.billing_month,
        studentCount: month?.studentCount ?? 0,
        referralPercent: month?.referralPercent ?? null,
        status: normalizeStatus(row.payment_status),
        paidAt: toIso(row.paid_at),
        uploaded: row.uploaded === true,
        fileName: toStr(row.file_name),
        uploadedAt: toIso(row.uploaded_at),
      };
    })
    .sort((a, b) => monthSortValue(b.billingMonth) - monthSortValue(a.billingMonth));
}

/**
 * Finds the Drive file behind a bill. Never cached: a download must reflect
 * the current row. Returns null when the bill is unknown or has no file yet.
 */
export async function getInvoiceFileRef(billId: string): Promise<InvoiceFileRef | null> {
  const rows = await mutate<{
    bill_id: string;
    counselor_id: string;
    drive_file_id: string | null;
    file_name: string | null;
  }>(
    `SELECT ${CI.billId} AS bill_id, ${CI.counselorId} AS counselor_id,
            ${CI.driveFileId} AS drive_file_id, ${CI.fileName} AS file_name
       FROM ${CI.table}
      WHERE upper(${CI.billId}) = $1
      LIMIT 1`,
    [normalizeBillId(billId)]
  );
  const row = rows[0];
  if (!row || !row.drive_file_id) return null;
  return {
    billId: row.bill_id,
    counselorId: row.counselor_id,
    driveFileId: row.drive_file_id,
    fileName: toStr(row.file_name),
  };
}

/** Looks up several bills at once for the reconciler. Keyed by upper-cased bill ID. */
export async function getBillsForReconcile(billIds: string[]): Promise<Map<string, BillForReconcile>> {
  const result = new Map<string, BillForReconcile>();
  if (billIds.length === 0) return result;

  const rows = await mutate<{
    id: string;
    bill_id: string;
    payment_status: string | null;
    drive_file_id: string | null;
  }>(
    `SELECT ${CI.id}::text AS id, ${CI.billId} AS bill_id,
            ${CI.paymentStatus} AS payment_status, ${CI.driveFileId} AS drive_file_id
       FROM ${CI.table}
      WHERE upper(${CI.billId}) = ANY($1::text[])`,
    [billIds.map(normalizeBillId)]
  );

  for (const row of rows) {
    result.set(normalizeBillId(row.bill_id), {
      id: row.id,
      billId: row.bill_id,
      status: normalizeStatus(row.payment_status),
      driveFileId: row.drive_file_id,
    });
  }
  return result;
}

/**
 * Attaches the Drive file to the bill and marks it Paid. paid_at and
 * uploaded_at keep any value already there, so a repeat run changes nothing.
 */
export async function attachInvoiceFile(id: string, driveFileId: string, fileName: string): Promise<void> {
  await mutate(
    `UPDATE ${CI.table}
        SET ${CI.driveFileId} = $2,
            ${CI.fileName} = $3,
            ${CI.uploadedAt} = COALESCE(${CI.uploadedAt}, now()),
            ${CI.paymentStatus} = 'Paid',
            ${CI.paidAt} = COALESCE(${CI.paidAt}, now())
      WHERE ${CI.id} = $1::bigint`,
    [id, driveFileId, fileName]
  );
}

/**
 * Creates Pending bills. A bill that already exists (same bill ID) is left
 * alone, so running this twice is harmless. Returns how many were created.
 */
export async function insertPendingBills(
  bills: { billId: string; counselorId: string; billingMonth: string }[]
): Promise<number> {
  if (bills.length === 0) return 0;
  const rows = await mutate<{ bill_id: string }>(
    `INSERT INTO ${CI.table} (${CI.billId}, ${CI.counselorId}, ${CI.billingMonth}, ${CI.paymentStatus})
     SELECT v.bill_id, v.counselor_id, v.billing_month, 'Pending'
       FROM unnest($1::text[], $2::text[], $3::text[]) AS v(bill_id, counselor_id, billing_month)
     ON CONFLICT DO NOTHING
     RETURNING ${CI.billId} AS bill_id`,
    [bills.map((b) => b.billId), bills.map((b) => b.counselorId), bills.map((b) => b.billingMonth)]
  );
  return rows.length;
}

export interface BillAwaitingEmail {
  id: string;
  billId: string;
  counselorId: string;
  billingMonth: string;
}

/**
 * Bills that are Paid, have their invoice file, and have not been emailed yet.
 * Only bills paid on or after `since` count, so bills that were Paid before
 * this feature existed never trigger an email.
 */
export async function getBillsAwaitingPaidEmail(since: Date): Promise<BillAwaitingEmail[]> {
  const rows = await mutate<{ id: string; bill_id: string; counselor_id: string; billing_month: string }>(
    `SELECT ${CI.id}::text AS id, ${CI.billId} AS bill_id,
            ${CI.counselorId} AS counselor_id, ${CI.billingMonth} AS billing_month
       FROM ${CI.table}
      WHERE ${CI.paymentStatus} = 'Paid'
        AND ${CI.driveFileId} IS NOT NULL
        AND ${CI.paidEmailSentAt} IS NULL
        AND ${CI.paidAt} >= $1
      ORDER BY ${CI.id}`,
    [since.toISOString()]
  );
  return rows.map((row) => ({
    id: row.id,
    billId: row.bill_id,
    counselorId: row.counselor_id,
    billingMonth: row.billing_month,
  }));
}

/**
 * Claims the email for a bill before sending, so two overlapping runs can never
 * both send it. Returns false when someone else already claimed it.
 */
export async function claimPaidEmail(id: string): Promise<boolean> {
  const rows = await mutate(
    `UPDATE ${CI.table} SET ${CI.paidEmailSentAt} = now()
      WHERE ${CI.id} = $1::bigint AND ${CI.paidEmailSentAt} IS NULL
      RETURNING ${CI.id}`,
    [id]
  );
  return rows.length > 0;
}

/** Undoes a claim after a failed send, so the next run tries again. */
export async function releasePaidEmail(id: string): Promise<void> {
  await mutate(`UPDATE ${CI.table} SET ${CI.paidEmailSentAt} = NULL WHERE ${CI.id} = $1::bigint`, [id]);
}

import { listInvoiceFiles, type DriveInvoiceFile } from "./drive-invoices";
import { extractBillId } from "./bill-id";
import { parseCutoff, splitByCutoff } from "./invoice-cutoff";
import { attachInvoiceFile, getBillsForReconcile, normalizeBillId } from "./counselor-invoices";

// Re-exported so callers (the cron route) keep one import for the reconciler.
export { InvalidCutoffError } from "./invoice-cutoff";

export interface ReconcileResult {
  filesScanned: number;
  skippedBeforeCutoff: number;
  matched: number;
  newlyPaid: number;
  unmatchedFiles: string[];
}

// Keeps the cron response small when the folder holds many unrelated files.
const MAX_UNMATCHED_LISTED = 50;

export async function reconcileCounselorInvoices(): Promise<ReconcileResult> {
  const cutoff = parseCutoff(process.env.INVOICES_RECONCILE_FROM);
  const files = await listInvoiceFiles();
  const { eligible, skipped } = splitByCutoff(files, cutoff);

  // The match is on the file name only. Nothing reads the PDF.
  // If two files name the same bill, the first one wins.
  const fileByBill = new Map<string, DriveInvoiceFile>();
  const unmatchedFiles: string[] = [];
  for (const file of eligible) {
    const found = extractBillId(file.name);
    const billId = found ? normalizeBillId(found) : null;
    if (!billId) {
      unmatchedFiles.push(file.name);
    } else if (!fileByBill.has(billId)) {
      fileByBill.set(billId, file);
    }
  }

  const bills = await getBillsForReconcile([...fileByBill.keys()]);

  let matched = 0;
  let newlyPaid = 0;
  for (const [billId, file] of fileByBill) {
    const bill = bills.get(billId);
    if (!bill) {
      unmatchedFiles.push(file.name);
      continue;
    }
    matched += 1;

    // Skip the write when nothing would change, so a second run is a no-op.
    if (bill.driveFileId === file.id && bill.status === "Paid") continue;

    await attachInvoiceFile(bill.id, file.id, file.name);
    if (bill.status !== "Paid") {
      newlyPaid += 1;
      console.info(`[Invoices] ${bill.billId} marked Paid from Drive file "${file.name}".`);
    }
  }

  return {
    filesScanned: files.length,
    skippedBeforeCutoff: skipped,
    matched,
    newlyPaid,
    unmatchedFiles: unmatchedFiles.slice(0, MAX_UNMATCHED_LISTED),
  };
}

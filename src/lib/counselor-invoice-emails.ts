import {
  claimPaidEmail,
  getBillsAwaitingPaidEmail,
  releasePaidEmail,
} from "./counselor-invoices";
import { getAllCounselors, getCounselorEmails } from "./counselors";
import { invoiceGmailConfig, sendEmail } from "./gmail";
import { buildPaidEmail, invoicesPortalUrl, parseRecipients } from "./invoice-email-content";

export interface EmailRunResult {
  enabled: boolean;
  sent: number;
  skipped: number; // no matching counselor, or no usable email address
  failed: number;
}

/**
 * Emails each counselor once their invoice is Paid and available.
 *
 * Safeguards, because this sends real email to real people:
 * - Off unless INVOICE_EMAILS_ENABLED is exactly "true".
 * - INVOICE_EMAIL_TEST_TO, when set, sends every email there instead of to the
 *   counselor, and does not mark anything as sent, so a real send still happens later.
 * - Each bill is claimed before sending, so it is emailed at most once. A failed
 *   send releases the claim and is retried on the next run.
 * - Only bills paid on or after `since` (the reconcile cutoff) are considered.
 */
export async function sendPaidEmails(since: Date): Promise<EmailRunResult> {
  const result: EmailRunResult = { enabled: false, sent: 0, skipped: 0, failed: 0 };
  if (process.env.INVOICE_EMAILS_ENABLED !== "true") return result;
  result.enabled = true;

  const bills = await getBillsAwaitingPaidEmail(since);
  if (bills.length === 0) return result;

  // The email is only useful with its link, so without a base URL nothing is
  // sent and nothing is marked as sent: the next run tries again once it is set.
  if (!process.env.NEXT_PUBLIC_BASE_URL?.trim()) {
    console.error("[Invoices] Paid emails not sent: NEXT_PUBLIC_BASE_URL is not set.");
    result.skipped = bills.length;
    return result;
  }

  // The counselor's page address (slug) comes from Airtable. Who the email goes
  // to comes from the email on the counselor's row in Supabase.
  const counselors = new Map((await getAllCounselors()).map((c) => [c.counselorId, c]));
  const emails = await getCounselorEmails([...new Set(bills.map((b) => b.counselorId))]);
  const testTo = process.env.INVOICE_EMAIL_TEST_TO?.trim() || null;

  for (const bill of bills) {
    const counselor = counselors.get(bill.counselorId);
    const recipients = testTo ? parseRecipients(testTo) : parseRecipients(emails.get(bill.counselorId));
    if (!counselor || recipients.length === 0) {
      console.warn(`[Invoices] No email sent for ${bill.billId}: no counselor page or no usable email.`);
      result.skipped += 1;
      continue;
    }

    if (!testTo && !(await claimPaidEmail(bill.id))) continue;

    const { subject, body } = buildPaidEmail({
      billingMonth: bill.billingMonth,
      portalUrl: invoicesPortalUrl(process.env.NEXT_PUBLIC_BASE_URL, counselor.slug)!,
    });

    try {
      await sendEmail(
        {
          to: recipients.join(", "),
          subject: testTo ? `[TEST] ${subject}` : subject,
          body,
        },
        invoiceGmailConfig()
      );
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      console.error(`[Invoices] Email for ${bill.billId} failed:`, err);
      if (!testTo) await releasePaidEmail(bill.id);
    }
  }

  return result;
}

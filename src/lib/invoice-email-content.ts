// What the "invoice is paid" email says and who it goes to. Pure functions with
// no Gmail, Drive or database imports, so they can be tested on their own.

export interface PaidEmailInput {
  billingMonth: string; // e.g. "October 2026"
  portalUrl: string; // link to the Invoices tab
}

/** Splits a field like "a@x.com, b@y.com" into the valid-looking addresses. */
export function parseRecipients(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(/[,;\s]+/)) {
    const address = part.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(address);
  }
  return result;
}

/** The link to the Invoices tab, or null when the base URL is not configured. */
export function invoicesPortalUrl(baseUrl: string | undefined, slug: string): string | null {
  const base = baseUrl?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/partner/${encodeURIComponent(slug)}?tab=invoices`;
}

const NEWLINE = String.fromCharCode(10);

// The wording is set by the RISE team: change it here only if they ask. The
// subject uses en dashes (not em dashes), as they wrote it.
export function buildPaidEmail(input: PaidEmailInput): { subject: string; body: string } {
  const body = [
    "Hi,",
    "",
    `The payment for ${input.billingMonth} has been processed.`,
    "",
    "You can download the corresponding invoice directly from your Partner Dashboard using the link below:",
    "",
    input.portalUrl,
    "",
    "Please feel free to reach out if you have any questions.",
    "",
    "Best,",
    "Team Rise",
  ].join(NEWLINE);

  return {
    subject: `Referral Invoice Processed – RISE Research – ${input.billingMonth}`,
    body,
  };
}

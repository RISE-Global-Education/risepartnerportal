// The safety guard for the Drive reconciler. Kept free of any Drive or database
// imports so it can be tested on its own.

export class InvalidCutoffError extends Error {}

export interface CutoffFile {
  createdTime: string | null;
}

/**
 * Parses the INVOICES_RECONCILE_FROM cutoff. A missing or invalid value stops
 * the run: with no cutoff the first run would attach files to, and mark Paid,
 * every old bill that happens to match.
 */
export function parseCutoff(value: string | undefined): Date {
  if (!value || !value.trim()) {
    throw new InvalidCutoffError("INVOICES_RECONCILE_FROM is not set.");
  }
  const cutoff = new Date(value.trim());
  if (Number.isNaN(cutoff.getTime())) {
    throw new InvalidCutoffError("INVOICES_RECONCILE_FROM is not a valid ISO 8601 date.");
  }
  return cutoff;
}

/** Keeps files created at or after the cutoff. A file with no creation time is skipped. */
export function splitByCutoff<T extends CutoffFile>(
  files: T[],
  cutoff: Date
): { eligible: T[]; skipped: number } {
  const eligible: T[] = [];
  let skipped = 0;
  for (const file of files) {
    const created = file.createdTime ? new Date(file.createdTime) : null;
    if (!created || Number.isNaN(created.getTime()) || created < cutoff) {
      skipped += 1;
    } else {
      eligible.push(file);
    }
  }
  return { eligible, skipped };
}

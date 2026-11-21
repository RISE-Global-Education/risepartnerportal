// A counselor bill's ID is the counselor's ID and the month, for example
// PR1126_October2026. It is also the name of the invoice file in Drive. One
// counselor gets one bill a month, so the ID needs no numbering.
//
// Everything about the format lives in this file: change it here and the
// reconciler, the download route and the monthly generator all follow.

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Splits a label such as "October 2026". Returns null unless it is a full month name and a year. */
export function parseMonthLabel(label: string): { monthIndex: number; year: number } | null {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === match[1].toLowerCase());
  if (monthIndex === -1) return null;
  return { monthIndex, year: Number(match[2]) };
}

/** "PR1126" and "October 2026" give "PR1126_October2026", or null when either is malformed. */
export function makeBillId(counselorId: string, billingMonth: string): string | null {
  const id = /^PR\d+$/i.exec(counselorId.trim())?.[0];
  const month = parseMonthLabel(billingMonth);
  if (!id || !month) return null;
  return `${id.toUpperCase()}_${MONTH_NAMES[month.monthIndex]}${month.year}`;
}

// The counselor code, then the month name and year. Between them (and after the
// code) a file name may use an underscore, a space or a hyphen. The lookbehind
// stops a code from matching inside a longer word or number.
const BILL_ID_IN_FILE_NAME = new RegExp(
  `(?<![A-Za-z0-9])(PR\\d+)[_\\s-]+(${MONTH_NAMES.join("|")})[_\\s-]*(\\d{4})(?!\\d)`,
  "i"
);

/** Pulls the bill ID out of a file name, in canonical form, or returns null. */
export function extractBillId(fileName: string): string | null {
  const match = BILL_ID_IN_FILE_NAME.exec(fileName);
  if (!match) return null;
  return makeBillId(match[1], `${match[2]} ${match[3]}`);
}

// What the download route accepts in its URL.
export const BILL_ID_FORMAT = /^PR\d+_(?:[A-Za-z]+)\d{4}$/i;

/** The month before the one that "now" falls in, by Los Angeles time, as a label like "October 2026". */
export function previousMonthLabel(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const previous = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  return `${MONTH_NAMES[previous.month - 1]} ${previous.year}`;
}

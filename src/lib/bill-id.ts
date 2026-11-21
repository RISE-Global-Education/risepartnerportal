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

// Billing periods run from the 26th of one month to the 26th of the next, in
// Indian Standard Time (IST, UTC+5:30, no daylight saving). A period is named after
// the month it ends in: October 26 to November 26 is the "November 2026" bill,
// raised on November 26. The start is inclusive and the end is exclusive, so a
// student who joins at midnight on the 26th belongs to the next period.
export const BILLING_DAY = 26;

// The clock the 26th is read on. IST has no daylight saving, so a period always
// starts and ends at the same IST time.
const BILLING_TIME_ZONE = "Asia/Kolkata";

function billingClockParts(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BILLING_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function labelFor(year: number, month: number): string {
  // Month is 1 to 12 but may overflow either way by one, which is wrapped here.
  const index = (((month - 1) % 12) + 12) % 12;
  const adjustedYear = year + Math.floor((month - 1) / 12);
  return `${MONTH_NAMES[index]} ${adjustedYear}`;
}

/** The bill an instant belongs to, such as "November 2026" for October 26 to November 25. */
export function billLabelForInstant(instant: Date): string {
  const { year, month, day } = billingClockParts(instant);
  return day >= BILLING_DAY ? labelFor(year, month + 1) : labelFor(year, month);
}

/** The most recent bill whose period has fully ended, such as "November 2026" on November 26. */
export function lastClosedBillLabel(now: Date = new Date()): string {
  const { year, month, day } = billingClockParts(now);
  return day >= BILLING_DAY ? labelFor(year, month) : labelFor(year, month - 1);
}

/** Spells a bill's period out, e.g. "October 26 to November 26", or null for an unreadable label. */
export function billPeriodText(label: string): string | null {
  const parsed = parseMonthLabel(label);
  if (!parsed) return null;
  const startMonth = MONTH_NAMES[(parsed.monthIndex + 11) % 12];
  return `${startMonth} ${BILLING_DAY} to ${MONTH_NAMES[parsed.monthIndex]} ${BILLING_DAY}`;
}

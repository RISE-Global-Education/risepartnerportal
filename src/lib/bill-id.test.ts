import { describe, expect, it } from "vitest";
import {
  BILL_ID_FORMAT,
  billLabelForInstant,
  billPeriodText,
  extractBillId,
  lastClosedBillLabel,
  makeBillId,
} from "./bill-id";

describe("makeBillId", () => {
  it("joins the counselor ID and the month with no space", () => {
    expect(makeBillId("PR1126", "October 2026")).toBe("PR1126_October2026");
  });

  it("upper-cases the counselor ID and fixes the month's case", () => {
    expect(makeBillId("pr12430", "october 2026")).toBe("PR12430_October2026");
  });

  it("returns null for a malformed counselor ID or month", () => {
    expect(makeBillId("CNS1042", "October 2026")).toBeNull();
    expect(makeBillId("PR1126", "Oct 2026")).toBeNull();
    expect(makeBillId("PR1126", "October")).toBeNull();
  });
});

describe("extractBillId", () => {
  it("reads the canonical file name", () => {
    expect(extractBillId("PR1126_October2026.pdf")).toBe("PR1126_October2026");
  });

  it("tolerates case and a space or hyphen between the parts", () => {
    expect(extractBillId("pr1126 october 2026.pdf")).toBe("PR1126_October2026");
    expect(extractBillId("PR1126-OCTOBER-2026 invoice.pdf")).toBe("PR1126_October2026");
  });

  it("does not match a code glued onto other letters or digits", () => {
    expect(extractBillId("xPR1126_October2026.pdf")).toBeNull();
    expect(extractBillId("PR1126_October20261.pdf")).toBeNull();
  });

  it("does not match a misspelled month or an LMS bill", () => {
    expect(extractBillId("PR1126_Octobr2026.pdf")).toBeNull();
    expect(extractBillId("BILL0042.pdf")).toBeNull();
  });
});

describe("BILL_ID_FORMAT", () => {
  it("accepts a bill ID and rejects anything else", () => {
    expect(BILL_ID_FORMAT.test("PR1126_October2026")).toBe(true);
    expect(BILL_ID_FORMAT.test("CNS1042")).toBe(false);
    expect(BILL_ID_FORMAT.test("../secret")).toBe(false);
  });
});

describe("billLabelForInstant (26th to 26th, IST)", () => {
  it("puts October 26 through November 25 in the November bill", () => {
    expect(billLabelForInstant(new Date("2026-10-26T12:00:00Z"))).toBe("November 2026");
    expect(billLabelForInstant(new Date("2026-11-20T12:00:00Z"))).toBe("November 2026");
    expect(billLabelForInstant(new Date("2026-11-25T12:00:00Z"))).toBe("November 2026");
  });

  it("starts a period at midnight IST on the 26th", () => {
    // Midnight IST (UTC+5:30) on October 26 is 18:30 UTC on October 25.
    expect(billLabelForInstant(new Date("2026-10-25T18:29:59Z"))).toBe("October 2026");
    expect(billLabelForInstant(new Date("2026-10-25T18:30:00Z"))).toBe("November 2026");
  });

  it("uses the same IST time in winter, since IST has no daylight saving", () => {
    // Midnight IST on November 26 is again 18:30 UTC the day before.
    expect(billLabelForInstant(new Date("2026-11-25T18:29:59Z"))).toBe("November 2026");
    expect(billLabelForInstant(new Date("2026-11-25T18:30:00Z"))).toBe("December 2026");
  });

  it("rolls into the next year", () => {
    expect(billLabelForInstant(new Date("2026-12-25T18:30:00Z"))).toBe("January 2027");
    expect(billLabelForInstant(new Date("2027-01-05T12:00:00Z"))).toBe("January 2027");
  });

  it("places students created near the edge on the right side", () => {
    // 9:08 AM Pacific on October 26 is 9:38 PM IST that day: the November bill.
    expect(billLabelForInstant(new Date("2026-10-26T16:08:08Z"))).toBe("November 2026");
    // 3:46 PM UTC on October 25 is 9:16 PM IST that day: still the October bill.
    expect(billLabelForInstant(new Date("2026-10-25T15:46:56Z"))).toBe("October 2026");
  });
});

describe("lastClosedBillLabel", () => {
  it("is the bill that ends on the 26th, from midnight IST that day", () => {
    expect(billLabelForInstant(new Date("2026-11-25T18:29:59Z"))).toBe("November 2026");
    expect(lastClosedBillLabel(new Date("2026-11-25T18:29:59Z"))).toBe("October 2026");
    expect(lastClosedBillLabel(new Date("2026-11-25T18:30:00Z"))).toBe("November 2026");
  });

  it("is the bill that just closed when the 9 AM IST job runs on the 26th", () => {
    // 9:00 AM IST on November 26 is 03:30 UTC that day.
    expect(lastClosedBillLabel(new Date("2026-11-26T03:30:00Z"))).toBe("November 2026");
    expect(lastClosedBillLabel(new Date("2026-10-26T03:30:00Z"))).toBe("October 2026");
  });

  it("is still the previous bill until the next 26th", () => {
    expect(lastClosedBillLabel(new Date("2026-11-21T12:00:00Z"))).toBe("October 2026");
    expect(lastClosedBillLabel(new Date("2026-12-10T12:00:00Z"))).toBe("November 2026");
  });

  it("handles the year boundary", () => {
    expect(lastClosedBillLabel(new Date("2027-01-10T12:00:00Z"))).toBe("December 2026");
    expect(lastClosedBillLabel(new Date("2027-01-26T17:00:00Z"))).toBe("January 2027");
  });
});

describe("billPeriodText", () => {
  it("spells the period out with full month names", () => {
    expect(billPeriodText("November 2026")).toBe("October 26 to November 26");
    expect(billPeriodText("January 2027")).toBe("December 26 to January 26");
  });

  it("returns null for an unreadable label", () => {
    expect(billPeriodText("someday")).toBeNull();
  });
});

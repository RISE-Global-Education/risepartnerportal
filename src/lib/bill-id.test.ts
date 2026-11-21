import { describe, expect, it } from "vitest";
import { BILL_ID_FORMAT, extractBillId, makeBillId, previousMonthLabel } from "./bill-id";

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

describe("previousMonthLabel", () => {
  it("gives the month before the current one", () => {
    expect(previousMonthLabel(new Date("2026-11-01T17:00:00Z"))).toBe("October 2026");
  });

  it("rolls back across the new year", () => {
    expect(previousMonthLabel(new Date("2027-01-01T17:00:00Z"))).toBe("December 2026");
  });

  it("uses Los Angeles time, not UTC, at the month boundary", () => {
    // 06:00 UTC on 1 November is still 31 October in Los Angeles.
    expect(previousMonthLabel(new Date("2026-11-01T06:00:00Z"))).toBe("September 2026");
  });
});

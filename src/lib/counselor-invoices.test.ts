import { describe, expect, it } from "vitest";
import { monthSortValue, normalizeBillId, normalizeStatus } from "./counselor-invoices";

describe("monthSortValue", () => {
  it("orders months chronologically across years", () => {
    const labels = ["October 2026", "January 2027", "September 2026"];
    const sorted = [...labels].sort((a, b) => monthSortValue(b) - monthSortValue(a));
    expect(sorted).toEqual(["January 2027", "October 2026", "September 2026"]);
  });

  it("sorts an unreadable month last", () => {
    expect(monthSortValue("someday")).toBeLessThan(monthSortValue("January 2020"));
  });
});

describe("normalizeStatus", () => {
  it("keeps the known statuses and defaults anything else to Pending", () => {
    expect(normalizeStatus("Paid")).toBe("Paid");
    expect(normalizeStatus("Processing")).toBe("Processing");
    expect(normalizeStatus("paid")).toBe("Pending");
    expect(normalizeStatus(null)).toBe("Pending");
  });
});

describe("normalizeBillId", () => {
  it("trims and upper-cases", () => {
    expect(normalizeBillId(" pr1126_october2026 ")).toBe("PR1126_OCTOBER2026");
  });
});

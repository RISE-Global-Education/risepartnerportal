import { describe, expect, it } from "vitest";
import {
  parseCounselorId,
  parseReferralPercent,
  referralMonthKey,
} from "./referral-months";

describe("parseCounselorId", () => {
  it("takes the PR code from the end of the name", () => {
    // Airtable separates the name and code with an em dash, built here from its code point.
    const dash = String.fromCharCode(0x2014);
    expect(parseCounselorId([`Q&A College Admissions ${dash} PR12430`])).toBe("PR12430");
    expect(parseCounselorId("Sedifly - pr12318")).toBe("PR12318");
  });

  it("returns null when there is no code", () => {
    expect(parseCounselorId(["Sedifly"])).toBeNull();
    expect(parseCounselorId(undefined)).toBeNull();
    expect(parseCounselorId(42)).toBeNull();
  });
});

describe("parseReferralPercent", () => {
  it("reads the lookup text Airtable sends", () => {
    expect(parseReferralPercent(["10.0%"])).toBe(10);
    expect(parseReferralPercent("15%")).toBe(15);
  });

  it("treats a number up to 1 as a fraction", () => {
    expect(parseReferralPercent(0.2)).toBe(20);
  });

  it("returns null for 0, missing or unreadable values so the rate is hidden", () => {
    expect(parseReferralPercent(["0.0%"])).toBeNull();
    expect(parseReferralPercent(0)).toBeNull();
    expect(parseReferralPercent(undefined)).toBeNull();
    expect(parseReferralPercent(["n/a"])).toBeNull();
  });
});

describe("referralMonthKey", () => {
  it("ignores case and surrounding spaces", () => {
    expect(referralMonthKey("pr1126", " October 2026 ")).toBe(referralMonthKey("PR1126", "october 2026"));
  });
});

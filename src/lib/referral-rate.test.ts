import { describe, expect, it } from "vitest";
import { hasReferralRate } from "./referral-rate";

describe("hasReferralRate", () => {
  it("is true for any rate above zero", () => {
    expect(hasReferralRate(0.1)).toBe(true);
    expect(hasReferralRate(0.25)).toBe(true);
    expect(hasReferralRate(0.0001)).toBe(true);
  });

  it("is false for zero, missing or unusable values", () => {
    expect(hasReferralRate(0)).toBe(false);
    expect(hasReferralRate(null)).toBe(false);
    expect(hasReferralRate(undefined)).toBe(false);
    expect(hasReferralRate(-0.1)).toBe(false);
    expect(hasReferralRate(Number.NaN)).toBe(false);
  });
});

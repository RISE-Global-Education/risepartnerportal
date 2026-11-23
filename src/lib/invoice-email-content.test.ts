import { describe, expect, it } from "vitest";
import { buildPaidEmail, invoicesPortalUrl, parseRecipients } from "./invoice-email-content";

describe("parseRecipients", () => {
  it("splits on commas, semicolons and spaces", () => {
    expect(parseRecipients("a@x.com, b@y.org; c@z.io")).toEqual(["a@x.com", "b@y.org", "c@z.io"]);
  });

  it("drops duplicates (ignoring case) and anything that is not an address", () => {
    expect(parseRecipients("A@x.com a@x.com not-an-email @bad.com")).toEqual(["A@x.com"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseRecipients(undefined)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
  });
});

describe("invoicesPortalUrl", () => {
  it("points at the Invoices tab and ignores a trailing slash", () => {
    expect(invoicesPortalUrl("https://portal.example.com/", "sedifly")).toBe(
      "https://portal.example.com/partner/sedifly?tab=invoices"
    );
  });

  it("is null when no base URL is configured", () => {
    expect(invoicesPortalUrl(undefined, "sedifly")).toBeNull();
    expect(invoicesPortalUrl("  ", "sedifly")).toBeNull();
  });
});

describe("buildPaidEmail", () => {
  const input = { billingMonth: "October 2026", portalUrl: "https://p.example/partner/x?tab=invoices" };

  it("uses the subject the RISE team wrote, with the month filled in", () => {
    expect(buildPaidEmail(input).subject).toBe(
      "Referral Invoice Processed – RISE Research – October 2026"
    );
  });

  it("uses the body the RISE team wrote, with the month and link filled in", () => {
    expect(buildPaidEmail(input).body).toBe(
      [
        "Hi,",
        "",
        "The payment for October 2026 has been processed.",
        "",
        "You can download the corresponding invoice directly from your Partner Dashboard using the link below:",
        "",
        "https://p.example/partner/x?tab=invoices",
        "",
        "Please feel free to reach out if you have any questions.",
        "",
        "Best,",
        "Team Rise",
      ].join(String.fromCharCode(10))
    );
  });

  it("never uses an em dash", () => {
    const { subject, body } = buildPaidEmail(input);
    expect(subject + body).not.toContain(String.fromCharCode(0x2014));
  });
});

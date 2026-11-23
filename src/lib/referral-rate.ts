/**
 * Whether a partner has a referral rate at all. The Counselor database stores it
 * as a fraction (0.1 means 10%), and it is empty or 0 for partners who are not on
 * a referral arrangement. Only partners with a rate have invoices.
 */
export function hasReferralRate(referralAmount: number | null | undefined): boolean {
  return typeof referralAmount === "number" && Number.isFinite(referralAmount) && referralAmount > 0;
}

import { cookies } from "next/headers";

/**
 * Whether the current request may see this counselor's invoices.
 *
 * Allowed: a partner logged in to this counselor's account (partner_auth holds
 * a comma-joined list of counselor IDs), or the CEO view of the partner page
 * (ceo_partner_auth) or the CEO dashboard (ceo_auth). A partner who never set
 * a password has no partner_auth cookie, so they are not allowed here.
 */
export async function canAccessCounselorInvoices(counselorId: string): Promise<boolean> {
  if (!counselorId) return false;
  const cookieStore = await cookies();

  if (cookieStore.get("ceo_partner_auth")?.value === "1") return true;
  if (cookieStore.get("ceo_auth")?.value === "1") return true;

  const authedIds = (cookieStore.get("partner_auth")?.value ?? "").split(",").filter(Boolean);
  return authedIds.includes(counselorId);
}

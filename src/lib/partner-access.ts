import { cookies } from "next/headers";
import { getAllCounselors } from "./counselors";

/**
 * Whether the current request may see this counselor's invoices. It follows the
 * same rule as the partner page itself:
 *
 * - A partner who has set a password needs to be logged in to it (partner_auth
 *   holds a comma-joined list of counselor IDs), unless staff are viewing the
 *   CEO view of the page (ceo_partner_auth) or the CEO dashboard (ceo_auth).
 * - A partner who has not set a password has an open page, so the invoices are
 *   open too. "Has set a password" is read from the same Airtable field the page
 *   uses, so the page and the download can never disagree.
 */
export async function canAccessCounselorInvoices(counselorId: string): Promise<boolean> {
  if (!counselorId) return false;
  const cookieStore = await cookies();

  if (cookieStore.get("ceo_partner_auth")?.value === "1") return true;
  if (cookieStore.get("ceo_auth")?.value === "1") return true;

  const authedIds = (cookieStore.get("partner_auth")?.value ?? "").split(",").filter(Boolean);
  if (authedIds.includes(counselorId)) return true;

  // Not logged in: allowed only when no password has been set for this partner.
  const counselor = (await getAllCounselors()).find((c) => c.counselorId === counselorId);
  return !!counselor && !counselor.partnerPassword;
}

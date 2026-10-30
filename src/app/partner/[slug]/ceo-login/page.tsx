import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CeoPartnerLoginClient from "./CeoPartnerLoginClient";

export default async function CeoPartnerLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Already signed in (e.g. this URL was bookmarked), here or on the CEO dashboard — skip the form.
  const cookieStore = await cookies();
  if (
    cookieStore.get("ceo_partner_auth")?.value === "1" ||
    cookieStore.get("ceo_auth")?.value === "1"
  ) {
    redirect(`/partner/${slug}`);
  }

  return <CeoPartnerLoginClient slug={slug} />;
}

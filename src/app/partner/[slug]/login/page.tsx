import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCounselorBySlug } from "@/lib/counselors";
import PartnerLoginClient from "./PartnerLoginClient";

export default async function PartnerLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Already signed in to this partner (e.g. this URL was bookmarked) — skip the form.
  const authedIds = ((await cookies()).get("partner_auth")?.value ?? "").split(",").filter(Boolean);
  if (authedIds.length > 0) {
    const result = await getCounselorBySlug(slug);
    if (result && authedIds.includes(result.counselor.counselorId)) {
      redirect(`/partner/${slug}`);
    }
  }

  return <PartnerLoginClient slug={slug} />;
}

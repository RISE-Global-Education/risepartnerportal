import CeoPartnerLoginClient from "./CeoPartnerLoginClient";

export default async function CeoPartnerLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CeoPartnerLoginClient slug={slug} />;
}

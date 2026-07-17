import PartnerLoginClient from "./PartnerLoginClient";

export default async function PartnerLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PartnerLoginClient slug={slug} />;
}

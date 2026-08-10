import PartnerCreatePasswordClient from "./PartnerCreatePasswordClient";

export default async function PartnerCreatePasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PartnerCreatePasswordClient slug={slug} />;
}

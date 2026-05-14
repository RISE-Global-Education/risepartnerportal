import { redirect } from "next/navigation";

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/partners/search`);
}

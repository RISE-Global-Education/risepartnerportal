import { redirect } from "next/navigation";

export default async function InsightsIndex({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/dashboard/${secret}/insights/mixmax`);
}

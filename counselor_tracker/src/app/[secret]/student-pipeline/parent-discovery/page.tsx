import { redirect } from "next/navigation";

export default async function ParentDiscoveryPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/student-pipeline/parent-discovery/missed-calls`);
}

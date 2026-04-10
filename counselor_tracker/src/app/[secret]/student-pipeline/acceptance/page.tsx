import { redirect } from "next/navigation";

export default async function AcceptancePage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/student-pipeline/acceptance/acceptance-not-converted`);
}

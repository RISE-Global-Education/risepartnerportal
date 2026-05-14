import { redirect } from "next/navigation";

export default async function Cohort2025Page({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/student-pipeline/cohort-2025/pending-outreach`);
}

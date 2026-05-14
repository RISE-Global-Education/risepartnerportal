import { redirect } from "next/navigation";

export default async function StudentPipelinePage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/student-pipeline/interview-stage`);
}

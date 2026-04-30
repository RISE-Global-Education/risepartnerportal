import { redirect } from "next/navigation";

export default async function MentorPipelinePage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/mentor-pipeline/mentor-interview`);
}

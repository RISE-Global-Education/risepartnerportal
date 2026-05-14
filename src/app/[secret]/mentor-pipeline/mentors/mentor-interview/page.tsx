import { redirect } from "next/navigation";

export default async function MentorInterviewPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/mentor-pipeline/mentors/mentor-interview/upcoming`);
}

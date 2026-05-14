import { redirect } from "next/navigation";

export default async function MentorsPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/mentor-pipeline/mentors/mentor-interview`);
}

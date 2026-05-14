import { redirect } from "next/navigation";

export default async function WritingCoachPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/mentor-pipeline/writing-coach/wc-interview`);
}

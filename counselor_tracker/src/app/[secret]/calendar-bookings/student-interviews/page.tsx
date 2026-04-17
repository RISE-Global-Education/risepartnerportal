import { redirect } from "next/navigation";

export default async function StudentInterviewsPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/calendar-bookings/student-interviews/upcoming`);
}

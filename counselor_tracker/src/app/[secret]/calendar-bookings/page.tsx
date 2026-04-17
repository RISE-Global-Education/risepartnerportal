import { redirect } from "next/navigation";

export default async function CalendarBookingsIndex({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const isAdmin = secret === process.env.DASHBOARD_SECRET;
  redirect(`/${secret}/calendar-bookings/${isAdmin ? "discovery-call" : "student-interviews"}`);
}

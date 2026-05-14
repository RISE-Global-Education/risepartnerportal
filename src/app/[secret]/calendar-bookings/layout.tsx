import SubTabNav from "./SubTabNav";
import TimeZoneClocks from "@/app/[secret]/student-pipeline/TimeZoneClocks";
import { notFound } from "next/navigation";

export default async function CalendarBookingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const isAdmin = secret === process.env.DASHBOARD_SECRET;
  const isTeam = secret === process.env.USER_SECRET;
  if (!isAdmin && !isTeam) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-rise-black font-heading">Calendar Bookings</h1>
        <TimeZoneClocks />
        <SubTabNav secret={secret} isAdmin={isAdmin} />
      </div>
      {children}
    </div>
  );
}

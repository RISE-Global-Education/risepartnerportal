import { notFound } from "next/navigation";
import NavBar from "@/components/dashboard/NavBar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  if (secret !== process.env.DASHBOARD_SECRET) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-rise-cream">
      <NavBar secret={secret} />
      {children}
    </div>
  );
}

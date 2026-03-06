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

  const isAdmin = secret === process.env.DASHBOARD_SECRET;
  const isUser = secret === process.env.USER_SECRET;

  if (!isAdmin && !isUser) {
    notFound();
  }

  const role = isAdmin ? "admin" : "user";

  return (
    <div className="min-h-screen bg-rise-cream">
      <NavBar secret={secret} role={role} />
      {children}
    </div>
  );
}

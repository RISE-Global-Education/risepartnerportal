import PartnersSubTabNav from "./SubTabNav";
import { notFound } from "next/navigation";

export default async function PartnersLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const isAdmin = secret === process.env.DASHBOARD_SECRET;
  const isUser = secret === process.env.USER_SECRET;
  if (!isAdmin && !isUser) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-rise-black font-heading">Partners</h1>
        <PartnersSubTabNav secret={secret} />
      </div>
      {children}
    </div>
  );
}

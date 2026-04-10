import ShortlistingSubNav from "./ShortlistingSubNav";
import { notFound } from "next/navigation";

export default async function ShortlistingLayout({
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
    <div>
      <ShortlistingSubNav secret={secret} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

import Cohort2025SubNav from "./Cohort2025SubNav";
import { notFound } from "next/navigation";

export default async function Cohort2025Layout({
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
      <Cohort2025SubNav secret={secret} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

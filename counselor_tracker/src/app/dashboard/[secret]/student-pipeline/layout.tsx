import SubTabNav from "./SubTabNav";
import RefreshButton from "./RefreshButton";
import { notFound } from "next/navigation";

export default async function StudentPipelineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  if (secret !== process.env.DASHBOARD_SECRET) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-rise-black font-heading">Student Pipeline</h1>
          <RefreshButton />
        </div>
        <SubTabNav secret={secret} />
      </div>
      {children}
    </div>
  );
}

import MentorParentTabNav from "./ParentTabNav";

export default async function MentorPipelineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mentor Pipeline</h1>
      <MentorParentTabNav secret={secret} />
      {children}
    </main>
  );
}

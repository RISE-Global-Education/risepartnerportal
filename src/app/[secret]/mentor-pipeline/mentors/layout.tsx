import MentorPipelineTabNav from "../TabNav";

export default async function MentorsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div>
      <MentorPipelineTabNav secret={secret} />
      {children}
    </div>
  );
}

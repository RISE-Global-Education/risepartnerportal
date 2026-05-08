import WCTabNav from "./TabNav";

export default async function WritingCoachLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div>
      <WCTabNav secret={secret} />
      {children}
    </div>
  );
}

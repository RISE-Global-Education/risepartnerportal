import DiscoverySubTabNav from "./SubTabNav";

export default async function DiscoveryCallLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div>
      <h2 className="text-base font-semibold text-rise-black font-heading">Discovery Call</h2>
      <DiscoverySubTabNav secret={secret} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

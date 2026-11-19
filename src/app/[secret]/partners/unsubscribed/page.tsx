import UnsubscribedClient from "./UnsubscribedClient";

export default async function UnsubscribedPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  return <UnsubscribedClient secret={secret} />;
}

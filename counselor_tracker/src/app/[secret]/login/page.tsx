import LoginClient from "./LoginClient";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const isCeo = secret === process.env.DASHBOARD_SECRET;
  return <LoginClient secret={secret} isCeo={isCeo} />;
}

import { redirect } from "next/navigation";

export default async function DiscoveryCallIndex({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/calendar-bookings/discovery-call/upcoming`);
}

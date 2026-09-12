import { getAllConversations } from "@/lib/conversations";
import { getAllCounselors } from "@/lib/counselors";
import InsightsClient from "./InsightsClient";

export default async function ConversationsInsightsPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const [conversations, counselors] = await Promise.all([
    getAllConversations(),
    getAllCounselors(),
  ]);

  const partnerOptions = counselors
    .map((c) => ({ id: c.id, companyName: c.companyName }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName));

  return (
    <InsightsClient
      conversations={conversations}
      partners={partnerOptions}
      secret={secret}
    />
  );
}

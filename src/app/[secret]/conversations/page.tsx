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

  // Lean roster for the follow-up tracker — every partner, not just ones
  // with a conversation already logged in this app, so someone who has
  // never been contacted still shows up rather than being invisible.
  const roster = counselors.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    risePoc: c.risePoc,
    followUpStatus: c.followUpStatus,
    lastConversationDate: c.lastConversationDate,
  }));

  return (
    <InsightsClient
      conversations={conversations}
      partners={partnerOptions}
      roster={roster}
      secret={secret}
    />
  );
}

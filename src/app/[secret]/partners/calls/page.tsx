import { getAllCounselors } from "@/lib/counselors";
import CallsClient from "./CallsClient";

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function CallsPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret: _secret } = await params;
  const counselors = await getAllCounselors();

  const stale = counselors
    .filter((c) => {
      if (!c.lastConversationDate) return true;
      return daysSince(c.lastConversationDate) > 28;
    })
    .sort((a, b) => {
      if (!a.lastConversationDate) return -1;
      if (!b.lastConversationDate) return 1;
      return new Date(a.lastConversationDate).getTime() - new Date(b.lastConversationDate).getTime();
    })
    .map((c) => ({
      id: c.id,
      companyName: c.companyName,
      slug: c.slug,
      counselorId: c.counselorId,
      pocNames: c.pocNames,
      risePoc: c.risePoc,
      lastConversationDate: c.lastConversationDate,
      days: c.lastConversationDate ? daysSince(c.lastConversationDate) : null,
    }));

  // Collect all unique RISE POCs that appear in this stale list
  const allRisePocs = Array.from(
    new Set(stale.flatMap((c) => c.risePoc))
  ).sort();

  return <CallsClient partners={stale} allRisePocs={allRisePocs} />;
}

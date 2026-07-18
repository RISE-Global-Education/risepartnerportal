import { getAllCounselors } from "@/lib/counselors";
import CallsClient from "./CallsClient";

const ALL_RISE_POCS = ["Shreyans", "Yash", "Prachi", "Arth", "Muskaan"];

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function CallsPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const counselors = await getAllCounselors();

  const HIDDEN_STATUSES = ["Rejected", "Unqualified"];

  const partners = counselors
    .filter((c) => !HIDDEN_STATUSES.includes(c.followUpStatus))
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
      followUpStatus: c.followUpStatus,
      partnerType: c.partnerType,
      country: c.country.trim(),
      capacity: c.capacity,
      lastConversationDate: c.lastConversationDate,
      days: c.lastConversationDate ? daysSince(c.lastConversationDate) : null,
    }));

  const allRisePocs = Array.from(
    new Set([...ALL_RISE_POCS, ...partners.flatMap((c) => c.risePoc)])
  ).sort();

  const allCountries = Array.from(
    new Set(partners.map((c) => c.country).filter(Boolean))
  ).sort();

  return (
    <CallsClient
      partners={partners}
      allRisePocs={allRisePocs}
      allCountries={allCountries}
      secret={secret}
    />
  );
}

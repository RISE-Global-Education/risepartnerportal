import type { MixmaxInsightsResponse } from "@/app/api/mixmax/route";
import InsightsTable from "./InsightsTable";
import RefreshButton from "./RefreshButton";

async function getMixmaxInsights(): Promise<MixmaxInsightsResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/mixmax`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const STAT_CARDS = [
  {
    key: "sent" as const,
    label: "Emails Sent",
    bg: "bg-blue-50",
    text: "text-blue-800",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "openRate" as const,
    label: "Open Rate",
    bg: "bg-amber-50",
    text: "text-amber-800",
    format: (v: number) => `${v}%`,
  },
  {
    key: "clickRate" as const,
    label: "Click Rate",
    bg: "bg-purple-50",
    text: "text-purple-800",
    format: (v: number) => `${v}%`,
  },
  {
    key: "replyRate" as const,
    label: "Reply Rate",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    format: (v: number) => `${v}%`,
  },
];

export default async function MixmaxInsightsPage() {
  const data = await getMixmaxInsights();

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
          <p className="font-semibold">Mixmax not connected</p>
          <p className="text-sm mt-1">
            Add your <code className="bg-amber-100 px-1 rounded">MIXMAX_API_KEY</code> to{" "}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> to enable email insights.
          </p>
        </div>
      </div>
    );
  }

  const { totals, recipients, cachedAt } = data;

  const fetchedLabel = cachedAt
    ? new Date(cachedAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " IST"
    : "Unknown";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold text-rise-black font-heading">Mixmax Insights</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-rise-brown bg-white border border-gray-200 rounded-md px-3 py-1.5">
            Powered by Mixmax · All sequences
          </span>
          <RefreshButton apiPath="/api/refresh/mixmax" />
        </div>
      </div>
      <p className="text-xs text-rise-brown/60 mb-6">
        Last updated: <span className="font-medium text-rise-brown">{fetchedLabel}</span>
      </p>

      <section>
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
          Overview — all sequences
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, bg, text, format }) => (
            <div key={key} className={`${bg} rounded-xl p-4 sm:p-5`}>
              <p className={`text-xs font-medium ${text} opacity-70 uppercase tracking-wide`}>
                {label}
              </p>
              <p className={`text-2xl sm:text-3xl font-bold ${text} mt-1`}>
                {format(totals[key])}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: "Opened", value: totals.opened, color: "text-amber-700" },
            { label: "Clicked", value: totals.clicked, color: "text-purple-700" },
            { label: "Bounced", value: totals.bounced, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-rise-brown uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <InsightsTable recipients={recipients} />
    </div>
  );
}

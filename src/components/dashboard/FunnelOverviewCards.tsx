import type { FunnelStage } from "@/lib/types";

const STAGE_CONFIG: Record<FunnelStage, { bg: string; text: string; label: string }> = {
  Lead: { bg: "bg-amber-50", text: "text-amber-800", label: "Leads" },
  Application: { bg: "bg-blue-50", text: "text-blue-800", label: "Applications" },
  Interview: { bg: "bg-purple-50", text: "text-purple-800", label: "Interviews" },
  Client: { bg: "bg-emerald-50", text: "text-emerald-800", label: "Clients" },
};

export default function FunnelOverviewCards({
  stageCounts,
  stageCountsPrevious,
}: {
  stageCounts: Record<FunnelStage, number>;
  stageCountsPrevious: Record<FunnelStage, number>;
}) {
  const stages: FunnelStage[] = ["Lead", "Application", "Interview", "Client"];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stages.map((stage) => {
        const config = STAGE_CONFIG[stage];
        const current = stageCounts[stage];
        const previous = stageCountsPrevious[stage];
        const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

        return (
          <div key={stage} className={`${config.bg} rounded-xl p-4 sm:p-5`}>
            <p className={`text-xs font-medium ${config.text} opacity-70 uppercase tracking-wide`}>
              {config.label}
            </p>
            <p className={`text-2xl sm:text-3xl font-bold ${config.text} mt-1`}>
              {current}
            </p>
            {previous > 0 && (
              <p className={`text-xs mt-1 ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {change >= 0 ? "+" : ""}{change}% vs prev period
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

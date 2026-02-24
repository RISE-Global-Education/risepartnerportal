import type { FunnelStage } from "@/lib/types";

const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string; bg: string }> = {
  Lead: {
    label: "Leads",
    color: "text-rise-brown",
    bg: "bg-rise-cream",
  },
  Application: {
    label: "Applications",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  Interview: {
    label: "Interviews",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  Client: {
    label: "Clients",
    color: "text-rise-green",
    bg: "bg-emerald-50",
  },
};

export default function FunnelStats({
  counts,
  total,
}: {
  counts: Record<FunnelStage, number>;
  total: number;
}) {
  const stages: FunnelStage[] = ["Lead", "Application", "Interview", "Client"];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rise-black font-heading">
          Student Pipeline
        </h2>
        <span className="text-sm text-rise-brown">
          {total} total student{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage];
          return (
            <div
              key={stage}
              className={`${config.bg} rounded-xl p-5 text-center`}
            >
              <p className={`text-3xl font-bold ${config.color} font-heading`}>
                {counts[stage]}
              </p>
              <p className={`text-sm mt-1 ${config.color} opacity-80`}>
                {config.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

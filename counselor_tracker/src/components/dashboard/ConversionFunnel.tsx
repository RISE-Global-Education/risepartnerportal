"use client";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];

export default function ConversionFunnel({
  data,
}: {
  data: { stage: string; count: number; rate: number }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {data.map((item, i) => {
          const widthPct = Math.max((item.count / maxCount) * 100, 8);
          return (
            <div key={item.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-rise-black">{item.stage}</span>
                <span className="text-sm text-rise-brown">{item.count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-8 relative">
                <div
                  className="h-8 rounded-full flex items-center justify-end pr-3 transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: COLORS[i] }}
                >
                  {i > 0 && (
                    <span className="text-xs font-medium text-white">{item.rate}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

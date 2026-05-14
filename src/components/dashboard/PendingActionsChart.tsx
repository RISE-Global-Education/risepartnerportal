"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SUB_STAGE_COLORS: Record<string, string> = {
  SWA1: "#3b82f6",
  SWA2: "#60a5fa",
  SWA3: "#93c5fd",
  "Call Shortlisting": "#8b5cf6",
  "Interview Completed": "#a78bfa",
  AWA1: "#f59e0b",
  AWA2: "#fbbf24",
  AWA3: "#fcd34d",
  "Call Payment": "#10b981",
};

export default function PendingActionsChart({
  subStageCounts,
}: {
  subStageCounts: Record<string, number>;
}) {
  const data = Object.entries(subStageCounts).map(([name, value]) => ({
    name,
    value,
    fill: SUB_STAGE_COLORS[name] || "#94a3b8",
  }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Pending Actions Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

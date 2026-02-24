"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  Lead: "#f59e0b",
  Application: "#3b82f6",
  Interview: "#8b5cf6",
  Client: "#10b981",
};

export default function StageEntriesChart({
  data,
}: {
  data: { date: string; Lead: number; Application: number; Interview: number; Client: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Stage Entries Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} />
            <Legend />
            {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((stage) => (
              <Area
                key={stage}
                type="monotone"
                dataKey={stage}
                stackId="1"
                stroke={COLORS[stage]}
                fill={COLORS[stage]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

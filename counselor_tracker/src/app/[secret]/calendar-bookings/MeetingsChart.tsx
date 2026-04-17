"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Range = 7 | 15 | 30 | 90;
const RANGES: Range[] = [7, 15, 30, 90];

function buildChartData(starts: string[], days: Range) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const counts = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const s of starts) {
    const day = s.slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => {
    const d = new Date(date);
    const label =
      days <= 15
        ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : days <= 30
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date, label, count };
  });
}

export default function MeetingsChart({ pastStarts }: { pastStarts: string[] }) {
  const [range, setRange] = useState<Range>(7);

  const data = useMemo(() => buildChartData(pastStarts, range), [pastStarts, range]);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-rise-brown">
          <span className="font-semibold text-rise-black">{total}</span> meeting{total !== 1 ? "s" : ""} in the past {range} days
        </span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                range === r
                  ? "border-rise-green text-rise-green bg-rise-green/5 font-semibold"
                  : "border-gray-200 text-rise-brown hover:border-gray-300 hover:text-rise-black"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#8B7355" }}
              axisLine={false}
              tickLine={false}
              interval={range <= 15 ? 0 : range <= 30 ? 1 : 6}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 10px" }}
              formatter={(v: number) => [v, "meetings"]}
              labelStyle={{ color: "#1a1a1a", fontWeight: 600 }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.date} fill={entry.count > 0 ? "#4CAF82" : "#e5e7eb"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

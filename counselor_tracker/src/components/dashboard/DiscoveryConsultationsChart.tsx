"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type DataPoint = { date: string; total: number; qualified: number; missed: number; unqualified: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d: DataPoint = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs space-y-1">
      <p className="font-semibold text-rise-black mb-1">{label}</p>
      <p className="text-gray-600">Total: <span className="font-bold text-rise-black">{d.total}</span></p>
      <p style={{ color: "#22c55e" }}>Qualified: <span className="font-bold">{d.qualified}</span></p>
      <p style={{ color: "#f59e0b" }}>Missed: <span className="font-bold">{d.missed}</span></p>
      <p style={{ color: "#ef4444" }}>Unqualified: <span className="font-bold">{d.unqualified}</span></p>
    </div>
  );
}

export default function DiscoveryConsultationsChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Consultations Held Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="qualified" stackId="a" fill="#22c55e" name="Qualified" />
            <Bar dataKey="unqualified" stackId="a" fill="#ef4444" name="Unqualified" />
            <Bar dataKey="missed" stackId="a" fill="#f59e0b" name="Missed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

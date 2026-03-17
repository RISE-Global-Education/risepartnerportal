"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DiscoveryConsultationsChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Consultations Held Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Consultations" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

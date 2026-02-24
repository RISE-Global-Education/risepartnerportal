"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function LeadsVsApplicationsChart({
  data,
}: {
  data: { date: string; leads: number; applications: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">New Leads vs Applications Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} />
            <Legend />
            <Line type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Leads" />
            <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} dot={false} name="Applications" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

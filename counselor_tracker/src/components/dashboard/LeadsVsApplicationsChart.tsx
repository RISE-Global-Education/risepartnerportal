"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function LeadsVsApplicationsChart({
  data,
}: {
  data: { date: string; leads: number; applications: number; brochureDownloads: number; clients: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Leads Flow</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} />
            <Legend />
            <Line type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={2} dot={false} name="Leads" />
            <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} dot={false} name="Applications" />
            <Line type="monotone" dataKey="brochureDownloads" stroke="#10b981" strokeWidth={2} dot={false} name="Brochure Downloads" />
            <Line type="monotone" dataKey="clients" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Clients" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

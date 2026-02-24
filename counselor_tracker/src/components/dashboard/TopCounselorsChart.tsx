"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  Lead: "#f59e0b",
  Application: "#3b82f6",
  Interview: "#8b5cf6",
  Client: "#10b981",
};

export default function TopCounselorsChart({
  data,
}: {
  data: {
    name: string;
    total: number;
    Lead: number;
    Application: number;
    Interview: number;
    Client: number;
  }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Top Referring Counselors</h3>
      {data.length === 0 ? (
        <p className="text-sm text-rise-brown py-8 text-center">No counselor data</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 125, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Lead" stackId="a" fill={COLORS.Lead} name="Lead" />
              <Bar dataKey="Application" stackId="a" fill={COLORS.Application} name="Application" />
              <Bar dataKey="Interview" stackId="a" fill={COLORS.Interview} name="Interview" />
              <Bar dataKey="Client" stackId="a" fill={COLORS.Client} name="Client" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

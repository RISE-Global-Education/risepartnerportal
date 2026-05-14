"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981"];

export default function VelocityChart({
  data,
}: {
  data: { label: string; avgDays: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-rise-black mb-4">Average Time Between Stages</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 140, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} unit=" days" />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={135} />
            <Tooltip formatter={(value) => [`${value} days`, "Average"]} />
            <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

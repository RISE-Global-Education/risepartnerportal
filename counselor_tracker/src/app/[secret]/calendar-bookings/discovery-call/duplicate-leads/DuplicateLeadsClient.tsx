"use client";

import { useState } from "react";
import type { DuplicateGroup } from "./page";

export default function DuplicateLeadsClient({ groups }: { groups: DuplicateGroup[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? groups.filter((g) =>
        g.records.some(
          (r) =>
            r.studentName.toLowerCase().includes(query.toLowerCase()) ||
            r.applicantId.toLowerCase().includes(query.toLowerCase()) ||
            r.studentEmail.includes(query.toLowerCase()) ||
            r.parentEmail.includes(query.toLowerCase())
        )
      )
    : groups;

  const matchLabel = (g: DuplicateGroup) => {
    if (g.matchedOn === "both") return "Student + Parent email";
    if (g.matchedOn === "student") return "Student email";
    return "Parent email";
  };

  return (
    <div className="space-y-6">
      <input
        type="text"
        placeholder="Search by name, applicant ID, or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Applicant ID</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Student Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Duplicate Appl ID</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Student Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Matched On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rise-brown">
                  No duplicates found.
                </td>
              </tr>
            ) : (
              filtered.map((g) => {
                const [primary, ...dupes] = g.records;
                return dupes.map((dupe, i) => (
                  <tr key={`${g.matchEmail}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-rise-brown">{primary.applicantId}</td>
                    <td className="px-4 py-3 font-medium text-rise-black">{primary.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-rise-brown">{dupe.applicantId}</td>
                    <td className="px-4 py-3 font-medium text-rise-black">{dupe.studentName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {matchLabel(g)}
                      </span>
                    </td>
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

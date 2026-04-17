"use client";

import { useState } from "react";
import type { MatchedRow, UnmatchedRow } from "./page";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function PastClient({
  matched,
  unmatched,
}: {
  matched: MatchedRow[];
  unmatched: UnmatchedRow[];
}) {
  const [query, setQuery] = useState("");

  const filteredMatched = query.trim()
    ? matched.filter(
        (r) =>
          r.studentName.toLowerCase().includes(query.toLowerCase()) ||
          r.applicantId.toLowerCase().includes(query.toLowerCase()) ||
          r.hostName.toLowerCase().includes(query.toLowerCase())
      )
    : matched;

  const filteredUnmatched = query.trim()
    ? unmatched.filter(
        (r) =>
          r.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          r.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : unmatched;

  return (
    <div className="space-y-10">
      <input
        type="text"
        placeholder="Search by name, email, or applicant ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm mb-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      {/* Matched table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Applicant ID</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Student Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Acceptance Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatched.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rise-brown">
                  No past interviews found.
                </td>
              </tr>
            ) : (
              filteredMatched.map((r) => (
                <tr key={r.uid} className={`transition-colors ${r.acceptanceSent ? "hover:bg-gray-50" : "bg-red-50 hover:bg-red-100"}`}>
                  <td className="px-4 py-3 text-rise-brown font-mono text-xs">{r.applicantId}</td>
                  <td className={`px-4 py-3 font-medium ${r.acceptanceSent ? "text-rise-black" : "text-red-800"}`}>{r.studentName}</td>
                  <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(r.start)}</td>
                  <td className="px-4 py-3">
                    {r.acceptanceSent ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unmatched table */}
      {unmatched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rise-black mb-3">
            Students not present in the pipeline
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-rise-brown">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee Name</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnmatched.map((r) => (
                  <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-rise-black">{r.attendeeName}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.attendeeEmail}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(r.start)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

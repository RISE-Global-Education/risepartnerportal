"use client";

import { useState } from "react";
import type { MatchedBooking, DiscoveryBooking } from "./page";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function UpcomingClient({
  matched,
  unmatched,
}: {
  matched: MatchedBooking[];
  unmatched: DiscoveryBooking[];
}) {
  const [query, setQuery] = useState("");

  const filteredMatched = query.trim()
    ? matched.filter(
        (r) =>
          r.studentName.toLowerCase().includes(query.toLowerCase()) ||
          r.parentName.toLowerCase().includes(query.toLowerCase())
      )
    : matched;

  const filteredUnmatched = query.trim()
    ? unmatched.filter(
        (b) =>
          b.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          b.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : unmatched;

  return (
    <div className="space-y-8">
      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      {/* Matched table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Applicant ID</th>
              <th className="px-4 py-3 text-left font-medium">Student Name</th>
              <th className="px-4 py-3 text-left font-medium">Parent Name</th>
              <th className="px-4 py-3 text-left font-medium">Host</th>
              <th className="px-4 py-3 text-left font-medium">Time (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatched.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rise-brown">
                  No matched bookings found.
                </td>
              </tr>
            ) : (
              filteredMatched.map((r) => (
                <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rise-brown">{r.applicantId}</td>
                  <td className="px-4 py-3 font-medium text-rise-black">{r.studentName}</td>
                  <td className="px-4 py-3 text-rise-brown">{r.parentName || "—"}</td>
                  <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                    {formatDateTime(r.start)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unmatched table */}
      {filteredUnmatched.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-rise-brown uppercase tracking-wide mb-3">
            Leads not in the pipeline
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-rise-brown">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Time (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnmatched.map((b) => (
                  <tr key={b.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-rise-black">{b.attendeeName}</td>
                    <td className="px-4 py-3 text-rise-brown">{b.attendeeEmail}</td>
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                      {formatDateTime(b.start)}
                    </td>
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

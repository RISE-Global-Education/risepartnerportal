"use client";

import { useState } from "react";
import type { MatchedMentor, UnmatchedMentor, ContractStatusLabel } from "./page";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function StatusBadge({ status }: { status: ContractStatusLabel }) {
  if (status === "Contract Sent") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Contract Sent
      </span>
    );
  }
  if (status === "Send Contract") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Send Contract
      </span>
    );
  }
  if (status === "Not Needed") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Not Needed
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
      Contract Not Sent
    </span>
  );
}

export default function PastClient({
  matched,
  unmatched,
}: {
  matched: MatchedMentor[];
  unmatched: UnmatchedMentor[];
}) {
  const [query, setQuery] = useState("");

  const filteredMatched = query.trim()
    ? matched.filter((r) =>
        r.mentorName.toLowerCase().includes(query.toLowerCase()) ||
        r.hostName.toLowerCase().includes(query.toLowerCase())
      )
    : matched;

  const filteredUnmatched = query.trim()
    ? unmatched.filter((r) =>
        r.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
        r.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : unmatched;

  return (
    <div className="space-y-10">
      <input
        type="text"
        placeholder="Search by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm mb-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Mentor Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Interview Date</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Booking Time (UTC)</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Contract Status</th>
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
                <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-rise-black">{r.mentorName}</td>
                  <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                    {r.interviewDate ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                    {formatDateTime(r.bookingStart)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.contractStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {unmatched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rise-black mb-3">
            Mentors not present in the pipeline
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-rise-brown">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee Name</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Booking Time (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnmatched.map((r) => (
                  <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-rise-black">{r.attendeeName}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.attendeeEmail}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                      {formatDateTime(r.bookingStart)}
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

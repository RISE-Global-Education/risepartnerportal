"use client";

import { useState } from "react";
import type { MentorInterviewBooking } from "./page";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function UpcomingClient({ bookings }: { bookings: MentorInterviewBooking[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? bookings.filter(
        (b) =>
          b.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          b.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : bookings;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm mb-4 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Email</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-rise-brown">
                  No upcoming mentor interviews found.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-rise-black">{b.attendeeName}</td>
                  <td className="px-4 py-3 text-rise-brown">{b.attendeeEmail}</td>
                  <td className="px-4 py-3 text-rise-brown">{b.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                    {formatDateTime(b.start)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { WCInterviewBooking } from "./page";
import WCDetailPopup from "@/components/mentor/WCDetailPopup";
import WCContractPopup from "@/components/mentor/WCContractPopup";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function UpcomingWCClient({ bookings, wcEmails }: { bookings: WCInterviewBooking[]; wcEmails: string[] }) {
  const wcEmailSet = new Set(wcEmails);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<WCInterviewBooking | null>(null);
  const [showManual, setShowManual] = useState(false);

  const filtered = query.trim()
    ? bookings.filter(
        (b) =>
          b.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          b.attendeeEmail.toLowerCase().includes(query.toLowerCase()) ||
          (b.university ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : bookings;

  return (
    <div>
      {selected && <WCDetailPopup booking={selected} onClose={() => setSelected(null)} />}
      {showManual && <WCContractPopup onClose={() => setShowManual(false)} />}

      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search by name, email or university..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
        <button
          onClick={() => setShowManual(true)}
          className="ml-4 shrink-0 bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Send Contract
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">University</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Application</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rise-brown">
                  No upcoming writing coach interviews found.
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const hasApp = wcEmailSet.has(b.attendeeEmail.toLowerCase());
                return (
                  <tr key={b.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-rise-black">{b.attendeeName}</td>
                    <td className="px-4 py-3 text-rise-brown">{b.university ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-rise-brown">{b.hostName}</td>
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(b.start)}</td>
                    <td className="px-4 py-3">
                      {hasApp ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Application Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          Application Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(b)}
                        className="text-rise-green hover:text-rise-green/70 transition-colors"
                        aria-label="View details"
                      >
                        →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

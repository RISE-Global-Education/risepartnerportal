"use client";

import { useState } from "react";
import type { MentorInterviewBooking } from "./page";
import ContractPopup from "@/components/mentor/ContractPopup";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function DetailPopup({ booking, onClose }: { booking: MentorInterviewBooking; onClose: () => void }) {
  const [showContract, setShowContract] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-rise-black">Interview Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Name</dt>
              <dd className="text-rise-black font-medium">{booking.attendeeName}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Email</dt>
              <dd className="text-rise-black break-all">{booking.attendeeEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Phone</dt>
              <dd className="text-rise-black">{booking.attendeePhone ?? <span className="text-gray-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">University</dt>
              <dd className="text-rise-black">{booking.university ?? <span className="text-gray-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Host</dt>
              <dd className="text-rise-black">{booking.hostName}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Meeting Time (UTC)</dt>
              <dd className="text-rise-black">{formatDateTime(booking.start)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Academic Background</dt>
              <dd className="text-rise-black">{booking.academicBackground ?? <span className="text-gray-300">—</span>}</dd>
            </div>
          </dl>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <button
              onClick={() => setShowContract(true)}
              className="w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Send Contract
            </button>
          </div>
        </div>
      </div>

      {showContract && (
        <ContractPopup
          initialName={booking.attendeeName}
          initialEmail={booking.attendeeEmail}
          onClose={() => setShowContract(false)}
        />
      )}
    </>
  );
}

export default function UpcomingClient({ bookings }: { bookings: MentorInterviewBooking[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MentorInterviewBooking | null>(null);
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
      {selected && <DetailPopup booking={selected} onClose={() => setSelected(null)} />}
      {showManual && <ContractPopup onClose={() => setShowManual(false)} />}

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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rise-brown">
                  No upcoming mentor interviews found.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-rise-black">{b.attendeeName}</td>
                  <td className="px-4 py-3 text-rise-brown">{b.university ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-rise-brown">{b.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(b.start)}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

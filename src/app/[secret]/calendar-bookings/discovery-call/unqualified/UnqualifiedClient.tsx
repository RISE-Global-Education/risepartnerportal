"use client";

import { useState } from "react";
import type { UnqualifiedRow } from "./page";

const DEFAULT_REASON =
  "This is a paid program (2500 USD) for students looking to apply abroad for their undergraduate studies and unfortunately we do not offer any financial aid.";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function UnqualifiedClient({ rows }: { rows: UnqualifiedRow[] }) {
  const [query, setQuery] = useState("");
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalUid, setModalUid] = useState<string | null>(null);
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [submitting, setSubmitting] = useState(false);

  const filtered = query.trim()
    ? rows.filter(
        (r) =>
          r.studentName.toLowerCase().includes(query.toLowerCase()) ||
          r.studentEmail.toLowerCase().includes(query.toLowerCase()) ||
          r.parentEmail.toLowerCase().includes(query.toLowerCase()) ||
          r.parentName.toLowerCase().includes(query.toLowerCase())
      )
    : rows;

  function openModal(uid: string) {
    setReason(DEFAULT_REASON);
    setError(null);
    setModalUid(uid);
  }

  function closeModal() {
    if (submitting) return;
    setModalUid(null);
    setError(null);
  }

  async function confirmCancel() {
    if (!modalUid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calcom/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: modalUid, cancellationReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      setCancelled((prev) => new Set(prev).add(modalUid));
      setModalUid(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

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
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Student Name</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Student Email</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Parent Name</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Parent Email</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Upcoming Booking (UTC)</th>
              <th className="px-3 py-2.5 text-left font-medium whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-rise-brown">
                  No records found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isCancelled = r.bookingUid ? cancelled.has(r.bookingUid) : false;
                return (
                  <tr key={r.recordId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-rise-black whitespace-nowrap">
                      {r.studentName}
                    </td>
                    <td className="px-3 py-2.5 text-rise-brown">
                      {r.studentEmail || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-rise-brown whitespace-nowrap">
                      {r.parentName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-rise-brown">
                      {r.parentEmail || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-rise-brown whitespace-nowrap">
                      {r.hostName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      {isCancelled ? (
                        <span className="text-gray-400 italic">Cancelled</span>
                      ) : r.bookingStart ? (
                        <span className="text-rise-black break-words">{formatDateTime(r.bookingStart)}</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          No booking
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.bookingUid && !isCancelled ? (
                        <button
                          onClick={() => openModal(r.bookingUid!)}
                          className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          Cancel Booking
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cancel Modal */}
      {modalUid && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-rise-black font-heading mb-1">
              Cancel Booking
            </h2>
            <p className="text-xs text-rise-brown mb-4">
              This message will be sent to the attendee as the cancellation reason.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rise-green resize-none"
            />

            {error && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-md border border-gray-200 text-rise-brown hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancel}
                disabled={submitting || !reason.trim()}
                className="text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Cancelling…" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { MatchedBooking, DiscoveryBooking } from "./page";

const DEFAULT_SUBJECT = "Interview Reminder | RISE Research";
const DEFAULT_BODY = `Hey,

I'm on the call and wanted to confirm if you're able to make it.

Let us know. Thanks.

Best,
Team RISE Research`;

interface ReminderState {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function ReminderModal({
  state,
  onChange,
  onClose,
  onSend,
  sending,
}: {
  state: ReminderState;
  onChange: (updated: ReminderState) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-bold text-rise-black text-base">Send Reminder</h2>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-rise-brown hover:text-rise-black transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">To</label>
            <input
              type="email"
              value={state.to}
              onChange={(e) => onChange({ ...state, to: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">CC</label>
            <input
              type="email"
              value={state.cc}
              onChange={(e) => onChange({ ...state, cc: e.target.value })}
              placeholder="Parent email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">BCC</label>
            <input
              type="email"
              value={state.bcc}
              onChange={(e) => onChange({ ...state, bcc: e.target.value })}
              placeholder="Optional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">Subject</label>
            <input
              type="text"
              value={state.subject}
              onChange={(e) => onChange({ ...state, subject: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">Body</label>
            <textarea
              value={state.body}
              onChange={(e) => onChange({ ...state, body: e.target.value })}
              rows={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none font-mono"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sending || !state.to || !state.subject || !state.body}
            className="px-5 py-2 text-sm font-semibold bg-rise-green text-white rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UpcomingClient({
  matched,
  unmatched,
}: {
  matched: MatchedBooking[];
  unmatched: DiscoveryBooking[];
}) {
  const [query, setQuery] = useState("");
  const [reminder, setReminder] = useState<ReminderState | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  function openReminder(r: MatchedBooking) {
    setReminder({
      to: r.studentEmail,
      cc: r.parentEmail,
      bcc: "",
      subject: DEFAULT_SUBJECT,
      body: DEFAULT_BODY,
    });
  }

  async function handleSend() {
    if (!reminder) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reminder.to,
          cc: reminder.cc || undefined,
          bcc: reminder.bcc || undefined,
          subject: reminder.subject,
          body: reminder.body,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send");
      }

      setReminder(null);
      setToast({ type: "success", message: `Reminder sent to ${reminder.to}` });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to send email" });
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

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
              <th className="px-4 py-3 text-left font-medium">Reminder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatched.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rise-brown">
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
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(r.start)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openReminder(r)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-rise-green text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Send Reminder
                    </button>
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
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(b.start)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reminder && (
        <ReminderModal
          state={reminder}
          onChange={setReminder}
          onClose={() => { if (!sending) setReminder(null); }}
          onSend={handleSend}
          sending={sending}
        />
      )}
    </div>
  );
}

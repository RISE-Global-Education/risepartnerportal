"use client";

import { useState } from "react";
import type { MatchedRow, NameMatchedRow, UnmatchedRow } from "./page";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function attemptLabel(count: number): string {
  if (count === 2) return "Booked twice";
  if (count === 3) return "Booked thrice";
  if (count === 4) return "Booked four times";
  if (count === 5) return "Booked five times";
  return `Booked ${count} times`;
}

interface NoteModalState {
  recordId: string;
  currentNotes: string;
}

function NoteModal({
  state,
  pocName,
  onClose,
  onSubmit,
}: {
  state: NoteModalState;
  pocName: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!note.trim()) {
      setError("Reason cannot be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(note.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-bold text-rise-black text-base">Add Reason</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-rise-brown hover:text-rise-black transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {state.currentNotes && (
            <div>
              <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                Previous Notes
              </label>
              <textarea
                readOnly
                value={state.currentNotes}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-brown bg-gray-50 resize-none font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
              New Reason <span className="text-rise-brown/50 normal-case font-normal">— will be saved as "{pocName}: …"</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); if (error) setError(null); }}
              rows={4}
              placeholder="Enter reason..."
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none"
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold bg-rise-green text-white rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PastClient({
  matched,
  nameMatched,
  unmatched,
  pocName,
}: {
  matched: MatchedRow[];
  nameMatched: NameMatchedRow[];
  unmatched: UnmatchedRow[];
  pocName: string;
}) {
  const [query, setQuery] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);
  const [notesMap, setNotesMap] = useState<Map<string, string>>(new Map());
  const [toast, setToast] = useState<string | null>(null);

  const filteredMatched = query.trim()
    ? matched.filter(
        (r) =>
          r.studentName.toLowerCase().includes(query.toLowerCase()) ||
          r.applicantId.toLowerCase().includes(query.toLowerCase()) ||
          r.hostName.toLowerCase().includes(query.toLowerCase())
      )
    : matched;

  const filteredNameMatched = query.trim()
    ? nameMatched.filter(
        (r) =>
          r.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          r.attendeeEmail.toLowerCase().includes(query.toLowerCase()) ||
          r.applicantId.toLowerCase().includes(query.toLowerCase())
      )
    : nameMatched;

  const filteredUnmatched = query.trim()
    ? unmatched.filter(
        (r) =>
          r.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
          r.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : unmatched;

  function openNoteModal(r: { airtableRecordId: string; pocNotes: string }) {
    const currentNotes = notesMap.get(r.airtableRecordId) ?? r.pocNotes;
    setNoteModal({ recordId: r.airtableRecordId, currentNotes });
  }

  async function handleNoteSubmit(note: string) {
    if (!noteModal) return;
    const res = await fetch("/api/student-interviews/poc-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: noteModal.recordId, note, pocName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save");
    setNotesMap((prev) => new Map(prev).set(noteModal.recordId, data.notes));
    setNoteModal(null);
    setToast("Reason saved.");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-10">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg bg-green-100 text-green-800 border border-green-200">
          {toast}
        </div>
      )}

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
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">POC Notes</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatched.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-rise-brown">
                  No past interviews found.
                </td>
              </tr>
            ) : (
              filteredMatched.map((r) => {
                const currentNotes = notesMap.get(r.airtableRecordId) ?? r.pocNotes;
                return (
                  <tr key={r.uid} className={`transition-colors ${r.acceptanceSent ? "hover:bg-gray-50" : "bg-red-50 hover:bg-red-100"}`}>
                    <td className="px-4 py-3 text-rise-brown font-mono text-xs">{r.applicantId}</td>
                    <td className={`px-4 py-3 font-medium ${r.acceptanceSent ? "text-rise-black" : "text-red-800"}`}>
                      <div className="flex items-center gap-2">
                        {r.studentName}
                        {r.bookingCount > 1 && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                            {attemptLabel(r.bookingCount)}
                          </span>
                        )}
                      </div>
                    </td>
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
                    <td className="px-4 py-3">
                      {!r.acceptanceSent && (
                        <button
                          onClick={() => openNoteModal(r)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-rise-green text-rise-green hover:bg-rise-green hover:text-white transition-colors whitespace-nowrap"
                        >
                          Add Reason
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[9rem]">
                      {currentNotes ? (
                        <span className="text-xs text-rise-brown break-words whitespace-pre-wrap">{currentNotes}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Name-matched table */}
      {filteredNameMatched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rise-black mb-1">
            Students not in the pipeline via email but matched by name
          </h3>
          <p className="text-xs text-rise-brown mb-3">
            Email did not match, but the attendee name matches a student or parent name in Airtable.
          </p>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-50 text-rise-brown">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee Name</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee Email</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Applicant ID</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Matched</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Acceptance Sent</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">POC Notes</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Reason</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNameMatched.map((r) => {
                  const currentNotes = notesMap.get(r.airtableRecordId) ?? r.pocNotes;
                  return (
                    <tr key={r.uid} className={`transition-colors ${r.acceptanceSent ? "hover:bg-amber-50/50" : "bg-red-50 hover:bg-red-100"}`}>
                      <td className={`px-4 py-3 font-medium ${r.acceptanceSent ? "text-rise-black" : "text-red-800"}`}>
                        <div className="flex items-center gap-2">
                          {r.attendeeName}
                          {r.bookingCount > 1 && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                              {attemptLabel(r.bookingCount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-rise-brown">{r.attendeeEmail}</td>
                      <td className="px-4 py-3 font-mono text-xs text-rise-brown">{r.applicantId}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.matchedOn === "student" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {r.matchedOn === "student" ? "Student" : "Parent"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.acceptanceSent ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Yes</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openNoteModal(r)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-rise-green text-rise-green hover:bg-rise-green hover:text-white transition-colors whitespace-nowrap"
                        >
                          Add Reason
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[9rem]">
                        {currentNotes ? (
                          <span className="text-xs text-rise-brown break-words whitespace-pre-wrap">{currentNotes}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                      <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(r.start)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Genuinely unmatched table */}
      {unmatched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rise-black mb-1">
            Students not in the pipeline
          </h3>
          <p className="text-xs text-rise-brown mb-3">
            No match found by email or name.
          </p>
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
                    <td className="px-4 py-3 font-medium text-rise-black">
                      <div className="flex items-center gap-2">
                        {r.attendeeName}
                        {r.bookingCount > 1 && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                            {attemptLabel(r.bookingCount)}
                          </span>
                        )}
                      </div>
                    </td>
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

      {noteModal && (
        <NoteModal
          state={noteModal}
          pocName={pocName}
          onClose={() => setNoteModal(null)}
          onSubmit={handleNoteSubmit}
        />
      )}
    </div>
  );
}

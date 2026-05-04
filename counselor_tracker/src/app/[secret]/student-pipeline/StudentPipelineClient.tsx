"use client";

import { useState } from "react";
import type { ScholarApplicant } from "./page";

const REGION_MAP: Record<string, string[]> = {
  "Asia": [
    "Afghanistan","Armenia","Azerbaijan","Bangladesh","Bhutan","Brunei","Cambodia","China",
    "East Timor (Timor-Leste)","Georgia","Hong Kong","India","Indonesia","Iran","Iraq","Israel",
    "Japan","Jordan","Kazakhstan","Kyrgyzstan","Laos","Lebanon","Macau","Malaysia",
    "Maldives","Mongolia","Myanmar (Burma)","Nepal","North Korea","Pakistan",
    "Philippines","Russia","Singapore","South Korea","Sri Lanka","Syria",
    "Taiwan","Tajikistan","Thailand","Turkey","Turkmenistan","Uzbekistan",
    "Vietnam","West Bank","Yemen","Gaza Strip",
  ],
  "GCC": [
    "Bahrain","Kuwait","Oman","Qatar","Saudi Arabia","United Arab Emirates",
  ],
  "US/Canada": [
    "United States","Canada",
  ],
  "Europe": [
    "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia",
    "Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Gibraltar","Greece",
    "Greenland","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania",
    "Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia","Norway",
    "Poland","Portugal","Romania","San Marino","Serbia","Slovakia","Slovenia","Spain",
    "Sweden","Switzerland","Ukraine","United Kingdom","Vatican City",
  ],
  "Africa": [
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde (Cape Verde)",
    "Cameroon","Central African Republic","Chad","Comoros","Democratic Republic of the Congo",
    "Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini (Swaziland)","Ethiopia","Gabon",
    "Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi",
    "Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria",
    "Republic of the Congo","Rwanda","Senegal","Seychelles","Sierra Leone","Somalia","South Africa",
    "South Sudan","Sudan","Tanzania","The Gambia","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
  ],
};

const REGIONS = ["Asia", "GCC", "US/Canada", "Europe", "Africa", "Other"] as const;
type Region = typeof REGIONS[number];

function getRegion(country: string): Region {
  for (const r of REGIONS) {
    if (r === "Other") continue;
    if (REGION_MAP[r]?.includes(country)) return r;
  }
  return "Other";
}

const DEFAULT_SUBJECT = "Interview Reminder | RISE Research";
const DEFAULT_BODY = `Hey,

I'm on the call and wanted to confirm if you're able to make it.

Let us know. Thanks.

Best,
Team RISE Research`;

interface ReminderState {
  student: ScholarApplicant;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
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

interface EditState {
  notes: string;
  interviewDate: string;
  mentorField: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-rise-black whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function Modal({
  student,
  onClose,
  onSuccess,
  userName,
}: {
  student: ScholarApplicant;
  onClose: () => void;
  onSuccess: (recordId: string) => void;
  userName: string;
}) {
  const [edit, setEdit] = useState<EditState>({
    notes: student.notes,
    interviewDate: student.interviewDate,
    mentorField: student.mentorField,
  });
  const [saving, setSaving] = useState(false);
  const [missedSaving, setMissedSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMissedInterview() {
    setError(null);
    setMissedSaving(true);
    try {
      const res = await fetch(`/api/student-pipeline/${student.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpStatus: "Call Shortlisting" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      onSuccess(student.recordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMissedSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!edit.interviewDate || !edit.notes.trim() || !edit.mentorField.trim()) {
      setError("Please fill in all required fields: Interview Date, Interview Notes, and Mentor Field.");
      return;
    }

    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        notes: edit.notes,
        interviewDate: edit.interviewDate,
        mentorField: edit.mentorField,
        acceptanceStatus: "Send Acceptance",
        ...(userName && { interviewPoc: userName }),
      };

      const res = await fetch(`/api/student-pipeline/${student.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      onSuccess(student.recordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-heading font-bold text-rise-black text-base">{student.name}</h2>
            <p className="text-xs text-rise-brown mt-0.5">{student.applicantId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-rise-brown hover:text-rise-black transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="modal-form" onSubmit={handleSubmit}>
            {/* Read-only details */}
            <section className="mb-6">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
                Applicant Details
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow label="Applicant ID" value={student.applicantId} />
                <DetailRow label="Name" value={student.name} />
                <DetailRow label="Phone Number" value={student.phone} />
                <DetailRow label="Parent Name" value={student.parentName} />
                <DetailRow label="Parent Phone Number" value={student.parentPhone} />
                <DetailRow label="Current Grade" value={student.currentGrade} />
                <DetailRow label="School / College" value={student.schoolCollege} />
                <DetailRow label="City" value={student.city} />
                <DetailRow label="Country" value={student.country} />
                <DetailRow label="Cohort" value={student.cohort} />
                <DetailRow label="Research Package" value={student.researchPackage} />
                <DetailRow label="Scholarship %" value={student.scholarshipPercent ? `${student.scholarshipPercent}%` : ""} />
                <DetailRow label="Previously Applied to RISE?" value={student.previouslyApplied} />
                <DetailRow label="Academic Score" value={student.academicScore} />
                <DetailRow label="Standardized Test Scores" value={student.testScores} />
                <DetailRow label="How Did They Hear About Us?" value={student.howHeard} />
                <DetailRow label="Referral Detail" value={student.howHeardDetail} />
              </dl>
            </section>

            {student.fieldsOfInterest && (
              <section className="mb-4">
                <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Field(s) of Interest
                </h3>
                <p className="text-sm text-rise-black">{student.fieldsOfInterest}</p>
              </section>
            )}

            {student.motivation && (
              <section className="mb-4">
                <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Motivation
                </h3>
                <p className="text-sm text-rise-black whitespace-pre-wrap">{student.motivation}</p>
              </section>
            )}

            {student.priorExperience && (
              <section className="mb-4">
                <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Prior Experience / Relevant Coursework
                </h3>
                <p className="text-sm text-rise-black whitespace-pre-wrap">{student.priorExperience}</p>
              </section>
            )}

            {/* Editable fields */}
            <section className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
                Interview
              </h3>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={edit.interviewDate}
                  onChange={(e) => setEdit((prev) => ({ ...prev, interviewDate: e.target.value }))}
                  className="w-full sm:w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Interview Notes
                </label>
                <textarea
                  value={edit.notes}
                  onChange={(e) => setEdit((prev) => ({ ...prev, notes: e.target.value }))}
                  onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
                  rows={4}
                  placeholder="Add notes from the interview…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none overflow-hidden"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                  Mentor Field
                </label>
                <input
                  type="text"
                  value={edit.mentorField}
                  onChange={(e) => setEdit((prev) => ({ ...prev, mentorField: e.target.value }))}
                  placeholder="Assign a mentor…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
                />
              </div>

            </section>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMissedInterview}
            disabled={missedSaving || saving}
            className="px-5 py-2 text-sm font-semibold bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-60"
          >
            {missedSaving ? "Saving…" : "Missed Interview"}
          </button>
          <button
            type="submit"
            form="modal-form"
            disabled={saving || missedSaving}
            className="px-5 py-2 text-sm font-semibold bg-rise-green text-white rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Sending…" : "Send Acceptance"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentPipelineClient({
  students: initialStudents,
  userName,
}: {
  students: ScholarApplicant[];
  userName: string;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [selected, setSelected] = useState<ScholarApplicant | null>(null);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [idSort, setIdSort] = useState<"asc" | "desc" | null>("asc");
  const [reminder, setReminder] = useState<ReminderState | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function openReminder(student: ScholarApplicant) {
    setReminder({
      student,
      to: student.email,
      cc: student.parentEmail,
      bcc: "",
      subject: DEFAULT_SUBJECT,
      body: DEFAULT_BODY,
    });
  }

  async function handleSendReminder() {
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

  function handleSuccess(recordId: string) {
    setStudents((prev) => prev.filter((s) => s.recordId !== recordId));
    setSelected(null);
  }

  const filtered = students
    .filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.applicantId.toLowerCase().includes(q);
      const matchesRegion = !region || getRegion(s.country.trim()) === region;
      return matchesQuery && matchesRegion;
    })
    .sort((a, b) => {
      if (idSort === "asc") return a.applicantId.localeCompare(b.applicantId);
      if (idSort === "desc") return b.applicantId.localeCompare(a.applicantId);
      return 0;
    });

  if (students.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        No pending acceptances — all caught up!
      </div>
    );
  }

  return (
    <>
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

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or applicant ID…"
          className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                <button onClick={() => setIdSort((s) => (s === null ? "asc" : s === "asc" ? "desc" : null))} className="inline-flex items-center gap-1 hover:text-rise-black transition-colors">
                  Applicant ID <span className="text-base leading-none">{idSort === "asc" ? "↑" : idSort === "desc" ? "↓" : "↕"}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Reminder
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-rise-brown text-sm">
                  No results{query || region ? " for current filters" : ""}
                </td>
              </tr>
            ) : (filtered.map((student) => (
              <tr key={student.recordId} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-rise-brown">
                  {student.applicantId}
                </td>
                <td className="px-4 py-3 font-medium text-rise-black">{student.name}</td>
                <td className="px-4 py-3 text-rise-brown">{student.country || "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openReminder(student)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-rise-green text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Send Reminder
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(student)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-rise-green hover:text-rise-green/80 transition-colors"
                    aria-label={`Open details for ${student.name}`}
                  >
                    View
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          student={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
          userName={userName}
        />
      )}

      {reminder && (
        <ReminderModal
          state={reminder}
          onChange={setReminder}
          onClose={() => { if (!sending) setReminder(null); }}
          onSend={handleSendReminder}
          sending={sending}
        />
      )}
    </>
  );
}

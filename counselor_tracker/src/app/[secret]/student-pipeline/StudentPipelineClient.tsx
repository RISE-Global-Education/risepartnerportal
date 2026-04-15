"use client";

import { useState } from "react";
import type { ScholarApplicant } from "./page";

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
  const [error, setError] = useState<string | null>(null);

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
                  rows={4}
                  placeholder="Add notes from the interview…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none"
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
            type="submit"
            form="modal-form"
            disabled={saving}
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
  const [idSort, setIdSort] = useState<"asc" | "desc" | null>("asc");

  function handleSuccess(recordId: string) {
    // Remove the student from the list (they now have an Acceptance Status set)
    setStudents((prev) => prev.filter((s) => s.recordId !== recordId));
    setSelected(null);
  }

  const filtered = students
    .filter((s) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return s.name.toLowerCase().includes(q) || s.applicantId.toLowerCase().includes(q);
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
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or applicant ID…"
          className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        />
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-rise-brown text-sm">
                  No results for &ldquo;{query}&rdquo;
                </td>
              </tr>
            ) : (filtered.map((student) => (
              <tr key={student.recordId} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-rise-brown">
                  {student.applicantId}
                </td>
                <td className="px-4 py-3 font-medium text-rise-black">{student.name}</td>
                <td className="px-4 py-3 text-rise-brown">{student.country || "—"}</td>
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
    </>
  );
}

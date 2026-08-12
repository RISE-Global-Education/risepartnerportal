"use client";

import { useEffect, useRef, useState } from "react";
import type { CompletedMentor } from "./page";

const MENTOR_FIELDS: { label: string; get: (m: CompletedMentor) => string }[] = [
  { label: "Mentor ID", get: (m) => m.mentorId },
  { label: "Full Name", get: (m) => m.name },
  { label: "Email", get: (m) => m.email },
  { label: "Phone", get: (m) => m.phone ?? "" },
  { label: "LinkedIn", get: (m) => m.linkedin ?? "" },
  { label: "University", get: (m) => m.university ?? "" },
  { label: "Rate", get: (m) => m.rate ?? "" },
  { label: "Interview Date", get: (m) => m.interviewDate ?? "" },
  { label: "Education", get: (m) => m.education ?? "" },
  { label: "Research Areas", get: (m) => m.researchAreas ?? "" },
  { label: "Notes", get: (m) => m.notes ?? "" },
  { label: "Resume", get: (m) => m.resumeUrl ?? "" },
];

function tsvCell(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(/\t/g, " ").trim();
}

function mentorsToTSV(list: CompletedMentor[]): string {
  const header = MENTOR_FIELDS.map((f) => f.label).join("\t");
  const rows = list.map((m) => MENTOR_FIELDS.map((f) => tsvCell(f.get(m))).join("\t"));
  return [header, ...rows].join("\n");
}

function DetailPopup({
  mentor,
  onClose,
  onCopy,
}: {
  mentor: CompletedMentor;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-rise-black">Mentor Details</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onCopy}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-rise-brown hover:border-gray-400 hover:text-rise-black transition-colors"
            >
              Copy
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Mentor ID</dt>
            <dd className="text-rise-black font-medium">{mentor.mentorId}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Name</dt>
            <dd className="text-rise-black font-medium">{mentor.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Email</dt>
            <dd className="text-rise-black break-all">{mentor.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Phone</dt>
            <dd className="text-rise-black">{mentor.phone ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">LinkedIn</dt>
            <dd className="text-rise-black break-all">
              {mentor.linkedin && mentor.linkedin.toLowerCase() !== "none" ? (
                <a
                  href={mentor.linkedin.startsWith("http") ? mentor.linkedin : `https://${mentor.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {mentor.linkedin}
                </a>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">University</dt>
            <dd className="text-rise-black">{mentor.university ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Rate</dt>
            <dd className="text-rise-black">{mentor.rate ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Interview Date</dt>
            <dd className="text-rise-black">{mentor.interviewDate ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Notes</dt>
            <dd className="text-rise-black whitespace-pre-wrap">{mentor.notes ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Education</dt>
            <dd className="text-rise-black whitespace-pre-wrap">{mentor.education ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Research Areas</dt>
            <dd className="text-rise-black">{mentor.researchAreas ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Resume</dt>
            <dd className="text-rise-black">
              {mentor.resumeUrl ? (
                <a
                  href={mentor.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {mentor.resumeFilename ?? "View resume"}
                </a>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="Select all mentors"
      className="w-4 h-4 rounded border-gray-300 text-rise-green focus:ring-rise-green"
    />
  );
}

export default function MentorFinderClient({ mentors }: { mentors: CompletedMentor[] }) {
  const [query, setQuery] = useState("");
  const [uniFilter, setUniFilter] = useState("");
  const [researchFilter, setResearchFilter] = useState("");
  const [selected, setSelected] = useState<CompletedMentor | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const universities = Array.from(new Set(mentors.map((m) => m.university).filter(Boolean) as string[])).sort();

  const filtered = mentors.filter((m) => {
    const matchesSearch = !query.trim() ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      (m.university ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (m.researchAreas ?? "").toLowerCase().includes(query.toLowerCase());

    const matchesUni = !uniFilter || (m.university ?? "") === uniFilter;

    const matchesResearch = !researchFilter.trim() ||
      (m.researchAreas ?? "").toLowerCase().includes(researchFilter.toLowerCase());

    return matchesSearch && matchesUni && matchesResearch;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.recordId));
  const someFilteredSelected = filtered.some((m) => selectedIds.has(m.recordId));

  function toggleRow(recordId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((m) => next.delete(m.recordId));
      } else {
        filtered.forEach((m) => next.add(m.recordId));
      }
      return next;
    });
  }

  async function copyMentors(list: CompletedMentor[]) {
    if (list.length === 0) return;
    await navigator.clipboard.writeText(mentorsToTSV(list));
    setToast(`Copied ${list.length} mentor${list.length !== 1 ? "s" : ""} to clipboard`);
    setTimeout(() => setToast(null), 2500);
  }

  const selectedMentors = mentors.filter((m) => selectedIds.has(m.recordId));

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg bg-green-100 text-green-800 border border-green-200">
          {toast}
        </div>
      )}

      {selected && (
        <DetailPopup
          mentor={selected}
          onClose={() => setSelected(null)}
          onCopy={() => copyMentors([selected])}
        />
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
        <select
          value={uniFilter}
          onChange={(e) => setUniFilter(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green bg-white"
        >
          <option value="">All Universities</option>
          {universities.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search research area..."
          value={researchFilter}
          onChange={(e) => setResearchFilter(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-rise-brown">
          <span className="font-semibold text-rise-black">{filtered.length}</span> mentor{filtered.length !== 1 ? "s" : ""}
        </p>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-rise-brown">
              <span className="font-semibold text-rise-black">{selectedIds.size}</span> selected
            </span>
            <button
              onClick={() => copyMentors(selectedMentors)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-rise-green text-white hover:opacity-90 transition-opacity"
            >
              Copy Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-rise-brown hover:text-rise-black transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 w-10">
                <HeaderCheckbox
                  checked={allFilteredSelected}
                  indeterminate={someFilteredSelected && !allFilteredSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Full Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">University</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Research Areas</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Rate</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Resume</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-rise-brown">
                  No completed mentors found.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.recordId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.recordId)}
                      onChange={() => toggleRow(m.recordId)}
                      aria-label={`Select ${m.name}`}
                      className="w-4 h-4 rounded border-gray-300 text-rise-green focus:ring-rise-green"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-rise-black">{m.name}</td>
                  <td className="px-4 py-3 text-rise-brown">{m.university ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-rise-brown">{m.researchAreas ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-rise-brown">{m.rate ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {m.resumeUrl ? (
                      <a
                        href={m.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-rise-green hover:underline text-xs font-medium"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(m)}
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

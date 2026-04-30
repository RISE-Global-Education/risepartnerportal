"use client";

import { useState } from "react";
import type { CompletedMentor } from "./page";

function DetailPopup({ mentor, onClose }: { mentor: CompletedMentor; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-rise-black">Mentor Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
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
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Education</dt>
            <dd className="text-rise-black whitespace-pre-wrap">{mentor.education ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Research Areas</dt>
            <dd className="text-rise-black">{mentor.researchAreas ?? <span className="text-gray-300">—</span>}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function MentorFinderClient({ mentors }: { mentors: CompletedMentor[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CompletedMentor | null>(null);

  const filtered = query.trim()
    ? mentors.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          (m.university ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (m.researchAreas ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : mentors;

  return (
    <div>
      {selected && <DetailPopup mentor={selected} onClose={() => setSelected(null)} />}

      <input
        type="text"
        placeholder="Search by name, university or research area..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm mb-4 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Full Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">University</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Rate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-rise-brown">
                  No completed mentors found.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.recordId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-rise-black">{m.name}</td>
                  <td className="px-4 py-3 text-rise-brown">{m.university ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-rise-brown">{m.rate ?? <span className="text-gray-300">—</span>}</td>
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

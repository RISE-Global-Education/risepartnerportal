"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoveryLead } from "./page";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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

function Modal({ lead, onClose }: { lead: DiscoveryLead; onClose: () => void }) {
  const router = useRouter();
  const [callNotes, setCallNotes] = useState(lead.callNotes);
  const [dropped, setDropped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSave() {
    setSaved(false);
    setSaveError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        callNotes,
        lastContacted: today,
      };
      if (dropped) {
        body.studentApplicationForm = "Drop";
      }

      const res = await fetch(`/api/parent-discovery/${lead.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? `Error ${res.status}`);
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setSaveError("Network error");
    } finally {
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
            <h2 className="font-heading font-bold text-rise-black text-base">{lead.studentName}</h2>
            <p className="text-xs text-rise-brown font-mono mt-0.5">{lead.applicantId}</p>
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

        {/* Body — read-only info */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Status strip */}
          <section className="mb-5 bg-rise-cream rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
            {lead.qualified && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Qualified</dt>
                <dd className="text-sm font-medium text-rise-green">{lead.qualified}</dd>
              </div>
            )}
            {lead.studentApplicationForm && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Application Form</dt>
                <dd className="text-sm font-medium text-rise-black">{lead.studentApplicationForm}</dd>
              </div>
            )}
            {lead.poc && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">POC</dt>
                <dd className="text-sm text-rise-black">{lead.poc}</dd>
              </div>
            )}
            {lead.counselorSource && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Counselor Source</dt>
                <dd className="text-sm text-rise-black">{lead.counselorSource}</dd>
              </div>
            )}
          </section>

          {/* Contact / profile */}
          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Student & Parent</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Applicant ID" value={lead.applicantId} />
              <DetailRow label="Student Name" value={lead.studentName} />
              <DetailRow label="Student Email" value={lead.studentEmail} />
              <DetailRow label="Parent / Guardian Name" value={lead.parentName} />
              <DetailRow label="Parent Email" value={lead.parentEmail} />
              <DetailRow label="Parent Phone" value={lead.parentPhone} />
              <DetailRow label="Current Grade" value={lead.currentGrade} />
              <DetailRow label="Country of Residence" value={lead.country} />
              <DetailRow label="School / College" value={lead.schoolCollege} />
            </dl>
          </section>

          {lead.additionalInfo && (
            <section className="mb-5">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                Anything else we should know?
              </h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{lead.additionalInfo}</p>
            </section>
          )}

          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Call Info</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lead.consultationDate ? (
                <div>
                  <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Consultation Date</dt>
                  <dd className="text-sm text-rise-black">{formatDateTime(lead.consultationDate)}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Consultation Date</dt>
                  <dd className="text-sm text-gray-400 italic">Not set</dd>
                </div>
              )}
              {lead.lastContacted && (
                <div>
                  <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Last Contacted</dt>
                  <dd className="text-sm text-rise-black">{formatDate(lead.lastContacted)}</dd>
                </div>
              )}
            </dl>
          </section>

          {lead.notes && (
            <section className="mb-2">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">Notes</h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{lead.notes}</p>
            </section>
          )}
        </div>

        {/* Footer — editable fields */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">

          {/* Call Notes */}
          <div>
            <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
              Call Notes
            </label>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={4}
              placeholder="Add call notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none"
            />
          </div>

          {/* Drop */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={dropped}
                onChange={(e) => setDropped(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rise-green accent-rise-green cursor-pointer"
              />
              <span className="text-sm text-rise-black">Drop</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {saving && <span className="text-xs text-rise-brown">Saving…</span>}
              {saved && !saving && (
                <span className="text-xs text-rise-green">
                  Saved — Last Contacted set to today
                </span>
              )}
              {saveError && !saving && <span className="text-xs text-red-500">{saveError}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-rise-green text-white rounded-lg hover:bg-rise-green/90 disabled:opacity-50 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MissedCallsClient({ leads }: { leads: DiscoveryLead[] }) {
  const [selected, setSelected] = useState<DiscoveryLead | null>(null);
  const [query, setQuery] = useState("");

  const filtered = leads.filter((l) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      l.studentName.toLowerCase().includes(q) ||
      l.applicantId.toLowerCase().includes(q) ||
      l.parentName.toLowerCase().includes(q)
    );
  });

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        No missed leads.
      </div>
    );
  }

  return (
    <>
      {selected && <Modal lead={selected} onClose={() => setSelected(null)} />}

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
                Applicant ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Parent Name
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
            ) : (
              filtered.map((lead) => (
                <tr key={lead.recordId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rise-brown">{lead.applicantId}</td>
                  <td className="px-4 py-3 font-medium text-rise-black">{lead.studentName}</td>
                  <td className="px-4 py-3 text-rise-brown">{lead.parentName || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(lead)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-rise-green hover:text-rise-green/80 transition-colors"
                      aria-label={`Open details for ${lead.studentName}`}
                    >
                      View
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

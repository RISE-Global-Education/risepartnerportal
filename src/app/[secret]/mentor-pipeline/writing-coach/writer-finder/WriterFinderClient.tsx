"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveWriter } from "./page";
import { WC_RATE_PATTERN, WC_RATE_HINT } from "@/lib/rate-format";

const WRITER_FIELDS: { label: string; get: (w: ActiveWriter) => string }[] = [
  { label: "Coach ID", get: (w) => w.coachId },
  { label: "Full Name", get: (w) => w.name },
  { label: "Email", get: (w) => w.email },
  { label: "Phone", get: (w) => w.phone ?? "" },
  { label: "Backup Contact", get: (w) => w.backupContact ?? "" },
  { label: "Rate", get: (w) => w.rate ?? "" },
  { label: "Interview Date", get: (w) => w.interviewDate ?? "" },
  { label: "Fields of Interest", get: (w) => w.fieldsOfInterest ?? "" },
  { label: "Notes", get: (w) => w.notes ?? "" },
  { label: "Resume", get: (w) => w.resumeUrl ?? "" },
];

function tsvCell(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(/\t/g, " ").trim();
}

function writersToTSV(list: ActiveWriter[]): string {
  const header = WRITER_FIELDS.map((f) => f.label).join("\t");
  const rows = list.map((w) => WRITER_FIELDS.map((f) => tsvCell(f.get(w))).join("\t"));
  return [header, ...rows].join("\n");
}

function DetailPopup({
  writer,
  onClose,
  onCopy,
  onRateSaved,
}: {
  writer: ActiveWriter;
  onClose: () => void;
  onCopy: () => void;
  onRateSaved: (recordId: string, newRate: string) => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(writer.rate ?? "");
    setError(null);
    setEditingRate(true);
  }

  function cancelEdit() {
    setEditingRate(false);
    setError(null);
  }

  async function saveRate() {
    if (!WC_RATE_PATTERN.test(draft)) {
      setError(WC_RATE_HINT);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/wc-finder/${writer.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to update rate");
      onRateSaved(writer.recordId, draft);
      setEditingRate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-rise-black">WC Details</h3>
          <div className="flex items-center gap-3">
            {!editingRate && (
              <button
                onClick={startEdit}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-rise-brown hover:border-gray-400 hover:text-rise-black transition-colors"
              >
                Edit Rate
              </button>
            )}
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
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Coach ID</dt>
            <dd className="text-rise-black font-medium">{writer.coachId}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Name</dt>
            <dd className="text-rise-black font-medium">{writer.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Email</dt>
            <dd className="text-rise-black break-all">{writer.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Phone</dt>
            <dd className="text-rise-black">{writer.phone ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Backup Contact</dt>
            <dd className="text-rise-black">{writer.backupContact ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className={editingRate ? "col-span-2" : undefined}>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Rate</dt>
            {editingRate ? (
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="e.g. 1200 INR"
                    disabled={saving}
                    autoFocus
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
                  />
                  <button
                    onClick={saveRate}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-semibold bg-rise-green text-white rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-rise-brown hover:text-rise-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
              </div>
            ) : (
              <dd className="text-rise-black">{writer.rate ?? <span className="text-gray-300">—</span>}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Interview Date</dt>
            <dd className="text-rise-black">{writer.interviewDate ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Fields of Interest</dt>
            <dd className="text-rise-black">{writer.fieldsOfInterest ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Notes</dt>
            <dd className="text-rise-black whitespace-pre-wrap">{writer.notes ?? <span className="text-gray-300">—</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Resume</dt>
            <dd className="text-rise-black">
              {writer.resumeUrl ? (
                <a
                  href={writer.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {writer.resumeFilename ?? "View resume"}
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
      aria-label="Select all WCs"
      className="w-4 h-4 rounded border-gray-300 text-rise-green focus:ring-rise-green"
    />
  );
}

export default function WriterFinderClient({ writers: initialWriters }: { writers: ActiveWriter[] }) {
  const [writers, setWriters] = useState(initialWriters);
  const [query, setQuery] = useState("");
  const [interestFilter, setInterestFilter] = useState("");
  const [selected, setSelected] = useState<ActiveWriter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const filtered = writers.filter((w) => {
    const matchesSearch = !query.trim() ||
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      (w.fieldsOfInterest ?? "").toLowerCase().includes(query.toLowerCase());

    const matchesInterest = !interestFilter.trim() ||
      (w.fieldsOfInterest ?? "").toLowerCase().includes(interestFilter.toLowerCase());

    return matchesSearch && matchesInterest;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((w) => selectedIds.has(w.recordId));
  const someFilteredSelected = filtered.some((w) => selectedIds.has(w.recordId));

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
        filtered.forEach((w) => next.delete(w.recordId));
      } else {
        filtered.forEach((w) => next.add(w.recordId));
      }
      return next;
    });
  }

  async function copyWriters(list: ActiveWriter[]) {
    if (list.length === 0) return;
    await navigator.clipboard.writeText(writersToTSV(list));
    setToast(`Copied ${list.length} WC${list.length !== 1 ? "s" : ""} to clipboard`);
    setTimeout(() => setToast(null), 2500);
  }

  function handleRateSaved(recordId: string, newRate: string) {
    setWriters((prev) => prev.map((w) => (w.recordId === recordId ? { ...w, rate: newRate } : w)));
    setSelected((prev) => (prev && prev.recordId === recordId ? { ...prev, rate: newRate } : prev));
    setToast("Rate updated");
    setTimeout(() => setToast(null), 2500);
  }

  const selectedWriters = writers.filter((w) => selectedIds.has(w.recordId));

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg bg-green-100 text-green-800 border border-green-200">
          {toast}
        </div>
      )}

      {selected && (
        <DetailPopup
          writer={selected}
          onClose={() => setSelected(null)}
          onCopy={() => copyWriters([selected])}
          onRateSaved={handleRateSaved}
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
        <input
          type="text"
          placeholder="Search field of interest..."
          value={interestFilter}
          onChange={(e) => setInterestFilter(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-rise-brown">
          <span className="font-semibold text-rise-black">{filtered.length}</span> WC{filtered.length !== 1 ? "s" : ""}
        </p>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-rise-brown">
              <span className="font-semibold text-rise-black">{selectedIds.size}</span> selected
            </span>
            <button
              onClick={() => copyWriters(selectedWriters)}
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
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Fields of Interest</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Rate</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Resume</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rise-brown">
                  No active WCs found.
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.recordId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(w.recordId)}
                      onChange={() => toggleRow(w.recordId)}
                      aria-label={`Select ${w.name}`}
                      className="w-4 h-4 rounded border-gray-300 text-rise-green focus:ring-rise-green"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-rise-black">{w.name}</td>
                  <td className="px-4 py-3 text-rise-brown">{w.fieldsOfInterest ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-rise-brown">{w.rate ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {w.resumeUrl ? (
                      <a
                        href={w.resumeUrl}
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
                      onClick={() => setSelected(w)}
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

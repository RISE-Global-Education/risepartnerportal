"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MissedAppFormLead } from "./page";

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

function Modal({
  lead,
  onClose,
  onSaved,
  userName,
}: {
  lead: MissedAppFormLead;
  onClose: () => void;
  onSaved: () => void;
  userName: string;
}) {
  const router = useRouter();
  const [newNotes, setNewNotes] = useState("");
  const [status, setStatus] = useState<"call_done" | "dnp" | "invalid" | "drop">("call_done");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaveError("");
    if ((status === "call_done" || status === "drop") && !newNotes.trim()) {
      setSaveError("Call notes are required.");
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const datePrefix = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const existing = lead.appFormCallNotes;

      // Always append to Application Form Call Notes
      let combinedAppFormNotes: string;
      let entry: string;
      if (status === "dnp") {
        entry = `DNP, ${datePrefix}`;
      } else if (status === "invalid") {
        entry = `Invalid Number, ${datePrefix}`;
      } else if (status === "drop") {
        entry = `Drop, ${datePrefix}: ${newNotes.trim()}`;
      } else {
        entry = `Call Done, ${datePrefix}: ${newNotes.trim()}`;
      }
      combinedAppFormNotes = existing.trim() ? existing.trimEnd() + "\n" + entry : entry;

      const body: Record<string, unknown> = {
        appFormCallNotes: combinedAppFormNotes,
        appFormCallDate: today,
        ...(userName && { callPoc: userName }),
      };

      if (status === "dnp") {
        body.incrementDnp = 1;
      } else if (status === "invalid") {
        body.incrementDnp = 4;
      } else if (status === "drop") {
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
        router.refresh();
        onSaved();
        onClose();
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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

        {/* Body */}
        <div className="px-6 py-4">
          {/* Status strip */}
          <section className="mb-5 bg-rise-cream rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
            {lead.qualified && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Qualified</dt>
                <dd className="text-sm font-medium text-rise-green">{lead.qualified}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Application Form</dt>
              <dd className="text-sm font-medium text-amber-600">{lead.studentApplicationForm || "Form Sent"}</dd>
            </div>
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

          {/* Student & Parent */}
          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Student &amp; Parent</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Dates & consultation */}
          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Dates</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Created</dt>
                <dd className="text-sm text-rise-black">{formatDate(lead.createdTime)}</dd>
              </div>
              {lead.appFormCallDate && (
                <div>
                  <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Last App Form Call</dt>
                  <dd className="text-sm text-rise-black">{formatDate(lead.appFormCallDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Consultation Date</dt>
                {lead.consultationDate ? (
                  <dd className="text-sm text-rise-black">{formatDateTime(lead.consultationDate)}</dd>
                ) : (
                  <dd className="text-sm text-gray-400 italic">Not set</dd>
                )}
              </div>
            </dl>
          </section>

          {lead.notes && (
            <section className="mb-2">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">Consultation Notes</h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{lead.notes}</p>
            </section>
          )}
        </div>

        {/* Footer — editable */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-2">Status</p>
            <div className="flex items-center gap-5 flex-wrap">
              {(["call_done", "dnp", "invalid", "drop"] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={val}
                    checked={status === val}
                    onChange={() => setStatus(val)}
                    className="accent-rise-green cursor-pointer"
                  />
                  <span className={`text-sm ${val === "drop" ? "text-red-600 font-medium" : "text-rise-black"}`}>
                    {val === "call_done" ? "Call Done" : val === "dnp" ? "Did Not Pick Up" : val === "invalid" ? "Invalid Number" : "Drop"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-rise-brown/70 space-y-1.5 border-t border-gray-100 pt-3">
            <p>
              <span className="font-semibold text-rise-brown">Did Not Pick Up:</span> Logs "dnp" to the application form call notes and increments the DNP counter.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Invalid Number:</span> Logs "invalid number" and adds 4 to the DNP counter.
            </p>
            <p>
              <span className="font-semibold text-red-600">Drop:</span> Marks the student as dropped — they will no longer appear in this list. Notes are required and logged with today&apos;s date.
            </p>
          </div>

          {/* Previous app form call notes — read only */}
          {lead.appFormCallNotes && (
            <div>
              <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
                Previous Notes
              </label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black bg-gray-50 whitespace-pre-wrap">
                {lead.appFormCallNotes}
              </div>
            </div>
          )}

          {/* New notes textarea */}
          <div>
            <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
              Add Call Notes{" "}
              {(status === "call_done" || status === "drop") && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => {
                setNewNotes(e.target.value);
                if (saveError) setSaveError("");
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
              rows={3}
              placeholder={status === "drop" ? "Reason for dropping this lead…" : "Add notes from this call…"}
              disabled={status === "dnp" || status === "invalid"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {saving && <span className="text-xs text-rise-brown">Saving…</span>}
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

export default function MissedApplicationFormClient({
  leads,
  userName,
}: {
  leads: MissedAppFormLead[];
  userName: string;
}) {
  const [selected, setSelected] = useState<MissedAppFormLead | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [idSort, setIdSort] = useState<"asc" | "desc" | null>("asc");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Derive sorted unique countries from leads for the dropdown
  const countryOptions = Array.from(new Set(leads.map((l) => l.country).filter(Boolean))).sort();

  const filtered = leads
    .filter((l) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        l.studentName.toLowerCase().includes(q) ||
        l.studentEmail.toLowerCase().includes(q) ||
        l.parentName.toLowerCase().includes(q) ||
        l.parentEmail.toLowerCase().includes(q) ||
        l.applicantId.toLowerCase().includes(q);
      const matchesCountry = !country || l.country.trim() === country;
      const matchesRegion = !region || getRegion(l.country.trim()) === region;
      return matchesQuery && matchesCountry && matchesRegion;
    })
    .sort((a, b) => {
      if (idSort === "asc") return a.applicantId.localeCompare(b.applicantId);
      if (idSort === "desc") return b.applicantId.localeCompare(a.applicantId);
      return 0;
    });

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        No leads — everyone has filled the application form.
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rise-green text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          Changes saved
        </div>
      )}
      {selected && (
        <Modal
          lead={selected}
          onClose={() => setSelected(null)}
          onSaved={() => setToast(true)}
          userName={userName}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or applicant ID…"
          className="w-full sm:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        />
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); if (e.target.value) setRegion(""); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        >
          <option value="">All countries</option>
          {countryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); if (e.target.value) setCountry(""); }}
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
                <button
                  onClick={() => setIdSort((s) => (s === null ? "asc" : s === "asc" ? "desc" : null))}
                  className="inline-flex items-center gap-1 hover:text-rise-black transition-colors"
                >
                  Applicant ID{" "}
                  <span className="text-base leading-none">
                    {idSort === "asc" ? "↑" : idSort === "desc" ? "↓" : "↕"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Parent Name
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
                <td colSpan={5} className="px-4 py-8 text-center text-rise-brown text-sm">
                  No results{query || country || region ? " for current filters" : ""}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.recordId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rise-brown">{lead.applicantId}</td>
                  <td className="px-4 py-3 font-medium text-rise-black">{lead.studentName}</td>
                  <td className="px-4 py-3 text-rise-brown">{lead.parentName || "—"}</td>
                  <td className="px-4 py-3 text-rise-brown">{lead.country || "—"}</td>
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

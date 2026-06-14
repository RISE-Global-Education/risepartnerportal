"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NotBookedNotOpenedLead } from "./page";

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

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde (Cape Verde)","Cambodia","Cameroon","Canada","Cayman Islands","Central African Republic","Chad","Chile","China","Colombia","Comoros","Cook Islands","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","East Timor (Timor-Leste)","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini (Swaziland)","Ethiopia","Fiji","Finland","France","Gabon","Gaza Strip","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Other","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Republic of the Congo","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","The Bahamas","The Gambia","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","West Bank","Yemen","Zambia","Zimbabwe",
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatCachedAt(iso: string | null): string {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) + " IST";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-rise-black whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function Modal({ lead, onClose, onSaved, userName }: { lead: NotBookedNotOpenedLead; onClose: () => void; onSaved: () => void; userName: string }) {
  const router = useRouter();
  const [newNotes, setNewNotes] = useState("");
  const [status, setStatus] = useState<"none" | "drop" | "dnp" | "invalid">("none");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString();

  async function handleSave() {
    setSaveError("");
    if (status !== "dnp" && status !== "invalid" && !newNotes.trim()) {
      setSaveError("Call notes are required.");
      return;
    }
    setSaving(true);
    try {
      const existing = lead.callNotes;
      const datePrefix = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const newEntry = status === "none"
        ? `Call Done, ${datePrefix}, ${newNotes.trim()}`
        : status === "dnp"
          ? newNotes.trim() ? `DNP ${datePrefix}, ${newNotes.trim()}` : `DNP ${datePrefix}`
          : status === "drop"
            ? `Drop ${datePrefix}, ${newNotes.trim()}`
            : `${datePrefix}: ${newNotes.trim()}`;
      const combined = existing.trim()
        ? existing.trimEnd() + "\n" + newEntry
        : newEntry;
      const body: Record<string, unknown> = { callNotes: combined, lastContacted: today, ...(userName && { callPoc: userName }) };
      if (status === "drop") body.studentApplicationForm = "Drop";
      else if (status === "dnp") body.incrementDnp = 1;
      else if (status === "invalid") body.incrementDnp = 4;

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
          <button onClick={onClose} className="text-rise-brown hover:text-rise-black transition-colors p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Mixmax badge */}
          <section className="mb-5 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <dt className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Sequence</dt>
              <dd className="text-sm font-medium text-amber-800">{lead.sequenceName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Times Sent</dt>
              <dd className="text-sm font-medium text-amber-800">{lead.sentCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Opens</dt>
              <dd className="text-sm font-medium text-amber-800">0</dd>
            </div>
          </section>

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
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">Anything else we should know?</h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{lead.additionalInfo}</p>
            </section>
          )}

          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Call Info</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Consultation Date</dt>
                <dd className="text-sm text-rise-black">
                  {lead.consultationDate ? formatDateTime(lead.consultationDate) : <span className="text-gray-400 italic">Not set</span>}
                </dd>
              </div>
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

        {/* Footer — editable */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">
          <div>
            <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-2">Status</p>
            <div className="flex items-center gap-5">
              {(["none", "drop", "dnp", "invalid"] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={val}
                    checked={status === val}
                    onChange={() => setStatus(val)}
                    className="accent-rise-green cursor-pointer"
                  />
                  <span className="text-sm text-rise-black">
                    {val === "none" ? "Call Done" : val === "drop" ? "Drop" : val === "dnp" ? "Did Not Pick Up" : "Invalid Number"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-rise-brown/70 space-y-1.5 border-t border-gray-100 pt-3">
            <p>
              <span className="font-semibold text-rise-brown">Call Done:</span> Mark this when you spoke to the person. They will be permanently removed from this tab.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Did Not Pick Up:</span> Mark this if the person didn&apos;t answer. Adds 1 to the DNP counter — at 4 they are removed permanently.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Invalid Number:</span> Marks this number as invalid. Adds 4 to the DNP counter and removes them permanently.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Drop:</span> This person will be removed from the pipeline. Please confirm with the team before marking anyone as Drop.
            </p>
          </div>

          {lead.callNotes && (
            <div>
              <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">Previous Notes</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black bg-gray-50 whitespace-pre-wrap">
                {lead.callNotes}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
              Add Call Notes {status !== "dnp" && status !== "invalid" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => { setNewNotes(e.target.value); if (saveError === "Call notes are required.") setSaveError(""); }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
              rows={3}
              placeholder="Add notes for this call…"
              disabled={false}
              className={`w-full border rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 resize-none overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50 ${saveError === "Call notes are required." ? "border-red-400 focus:ring-red-300/40" : "border-gray-200 focus:ring-rise-green/40"}`}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              {saving && <span className="text-xs text-rise-brown">Saving…</span>}
              {saveError && !saving && <span className="text-xs text-red-500">{saveError}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors">
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

function MixmaxBanner({
  cachedAt,
  onRefresh,
  refreshing,
  refreshError,
}: {
  cachedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  refreshError: string | null;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs text-rise-brown">
      <span>
        Mixmax data as of{" "}
        <span className="font-medium text-rise-black">{formatCachedAt(cachedAt)}</span>
      </span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-rise-brown hover:border-gray-400 hover:text-rise-black transition-colors disabled:opacity-50"
      >
        <svg className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {refreshing ? "Refreshing…" : "Refresh Mixmax"}
      </button>
      {refreshError && <span className="text-red-500">{refreshError}</span>}
    </div>
  );
}

export default function NotBookedNotOpenedClient({
  leads,
  mixmaxCachedAt,
  userName,
}: {
  leads: NotBookedNotOpenedLead[];
  mixmaxCachedAt: string | null;
  userName: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<NotBookedNotOpenedLead | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [idSort, setIdSort] = useState<"asc" | "desc" | null>("asc");
  const [sentSort, setSentSort] = useState<"asc" | "desc" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function cycleSentSort() {
    setSentSort((s) => (s === null ? "asc" : s === "asc" ? "desc" : null));
  }
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/refresh/mixmax", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = leads
    .filter((l) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        l.studentName.toLowerCase().includes(q) ||
        l.studentEmail.toLowerCase().includes(q) ||
        l.parentName.toLowerCase().includes(q) ||
        l.parentEmail.toLowerCase().includes(q);
      const matchesCountry = !country || l.country.trim() === country;
      const matchesRegion = !region || getRegion(l.country.trim()) === region;
      return matchesQuery && matchesCountry && matchesRegion;
    })
    .sort((a, b) => {
      if (idSort === "asc") return a.applicantId.localeCompare(b.applicantId);
      if (idSort === "desc") return b.applicantId.localeCompare(a.applicantId);
      if (sentSort === "asc") return a.sentCount - b.sentCount;
      if (sentSort === "desc") return b.sentCount - a.sentCount;
      return 0;
    });

  if (leads.length === 0) {
    return (
      <>
        <MixmaxBanner cachedAt={mixmaxCachedAt} onRefresh={handleRefresh} refreshing={refreshing} refreshError={refreshError} />
        <div className="text-center py-16 text-rise-brown text-sm">No leads found.</div>
      </>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rise-green text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          Changes saved — Last Contacted set to today
        </div>
      )}
      {selected && <Modal lead={selected} onClose={() => setSelected(null)} onSaved={() => setToast(true)} userName={userName} />}

      <MixmaxBanner cachedAt={mixmaxCachedAt} onRefresh={handleRefresh} refreshing={refreshing} refreshError={refreshError} />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student name, email, parent name or email…"
          className="w-full sm:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        />
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); if (e.target.value) setRegion(""); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
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
        <a
          href="https://docs.google.com/document/d/1LiVJyi05C1bDaoW7hNg4y2BDa_8V3PUxF3-9dmZABkU/edit?tab=t.q84zp926nf25"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-rise-green text-white rounded-lg hover:bg-rise-green/90 transition-colors"
        >
          Calling Script
        </a>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">Student Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">Parent Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">Country</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                <button
                  onClick={cycleSentSort}
                  className="inline-flex items-center gap-1 hover:text-rise-black transition-colors"
                >
                  Sent
                  <span className="text-base leading-none">
                    {sentSort === "asc" ? "↑" : sentSort === "desc" ? "↓" : "↕"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-rise-brown uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rise-brown text-sm">
                  No results{query || country || region ? " for current filters" : ""}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.recordId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rise-brown">{lead.applicantId}</td>
                  <td className="px-4 py-3 font-medium text-rise-black">{lead.studentName}</td>
                  <td className="px-4 py-3 text-rise-brown">{lead.parentName || "—"}</td>
                  <td className="px-4 py-3 text-xs text-rise-brown">{lead.country || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                      {lead.sentCount} {lead.sentCount === 1 ? "send" : "sends"}
                    </span>
                  </td>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingOutreachApplicant } from "./page";

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
  for (const region of REGIONS) {
    if (region === "Other") continue;
    if (REGION_MAP[region]?.includes(country)) return region;
  }
  return "Other";
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

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Modal({
  applicant,
  onClose,
  onSaved,
  userName,
}: {
  applicant: PendingOutreachApplicant;
  onClose: () => void;
  onSaved: (addedToPd: boolean) => void;
  userName: string;
}) {
  const router = useRouter();
  const [newNotes, setNewNotes] = useState("");
  const [status, setStatus] = useState<"none" | "drop" | "dnp" | "add_to_pd">("none");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const today = new Date().toISOString();

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const existing = applicant.outreachNotes2025;
      const datePrefix = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const combined = existing.trim() && newNotes.trim()
        ? existing.trimEnd() + "\n" + datePrefix + ": " + newNotes.trim()
        : existing.trim()
          ? existing
          : datePrefix + ": " + newNotes.trim();
      const body: Record<string, unknown> = {
        outreachNotes2025: combined,
        lastCallDate: today,
        ...(userName && { callPoc: userName }),
      };
      if (status === "drop") {
        body.outreach2025 = "Dropped";
      } else if (status === "dnp") {
        body.incrementDnp = true;
        body.outreachNotes2025 = existing.trim() ? existing.trimEnd() + "\ndnp" : "dnp";
      } else if (status === "add_to_pd") {
        body.outreach2025 = "Interested";
      }

      const patchRes = await fetch(`/api/student-pipeline/${applicant.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        setSaveError(data.error ?? `Error ${patchRes.status}`);
        return;
      }

      if (status === "add_to_pd") {
        const pdRes = await fetch("/api/parent-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: applicant.name,
            studentEmail: applicant.studentEmail,
            parentName: applicant.parentName,
            parentEmail: applicant.parentEmail,
            parentPhone: applicant.parentPhone,
            currentGrade: applicant.currentGrade,
            country: applicant.country,
            schoolCollege: applicant.schoolCollege,
          }),
        });
        if (!pdRes.ok) {
          const data = await pdRes.json().catch(() => ({}));
          setSaveError(data.error ?? `Error creating PD record: ${pdRes.status}`);
          return;
        }
      }

      router.refresh();
      onSaved(status === "add_to_pd");
      onClose();
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
            <h2 className="font-heading font-bold text-rise-black text-base">{applicant.name}</h2>
            <p className="text-xs text-rise-brown font-mono mt-0.5">{applicant.applicantId}</p>
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

        {/* Body — read-only */}
        <div className="px-6 py-4">
          {/* Status strip */}
          <section className="mb-5 bg-rise-cream rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
            {applicant.followUpStatus && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Follow Up Status</dt>
                <dd className="text-sm font-medium text-rise-green">{applicant.followUpStatus}</dd>
              </div>
            )}
            {applicant.researchPackage && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Research Package</dt>
                <dd className="text-sm text-rise-black">{applicant.researchPackage}</dd>
              </div>
            )}
            {applicant.outreach2025 && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">2025 Outreach</dt>
                <dd className="text-sm text-rise-black">{applicant.outreach2025}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Applied On</dt>
              <dd className="text-sm text-rise-black">{formatDate(applicant.createdTime)}</dd>
            </div>
            {applicant.lastCallDate && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Last Call Date</dt>
                <dd className="text-sm text-rise-black">{formatDate(applicant.lastCallDate)}</dd>
              </div>
            )}
          </section>

          {/* Student & Parent */}
          <section className="mb-5">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Student & Parent</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Name" value={applicant.name} />
              <DetailRow label="Student Email" value={applicant.studentEmail} />
              <DetailRow label="Phone Number" value={applicant.phone} />
              <DetailRow label="Parent Name" value={applicant.parentName} />
              <DetailRow label="Parent Email" value={applicant.parentEmail} />
              <DetailRow label="Parent Phone" value={applicant.parentPhone} />
              <DetailRow label="Current Grade" value={applicant.currentGrade} />
              <DetailRow label="School / College" value={applicant.schoolCollege} />
              <DetailRow label="City" value={applicant.city} />
              <DetailRow label="Country" value={applicant.country} />
              <DetailRow label="Cohort" value={applicant.cohort} />
              <DetailRow label="Previously Applied to RISE?" value={applicant.previouslyApplied} />
            </dl>
          </section>

          {/* Application */}
          <section className="mb-5 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Application</h3>
            <dl className="flex flex-col gap-3">
              <DetailRow label="Field(s) of Interest" value={applicant.fieldsOfInterest} />
              <DetailRow label="Academic Score" value={applicant.academicScore} />
              <DetailRow label="Standardized Test Scores" value={applicant.testScores} />
              <DetailRow label="Motivation" value={applicant.motivation} />
              <DetailRow label="Prior Experience / Relevant Coursework" value={applicant.priorExperience} />
              <DetailRow label="How Did They Hear About Us?" value={applicant.howHeard} />
              <DetailRow label="Referral Detail" value={applicant.howHeardDetail} />
            </dl>
          </section>
        </div>

        {/* Footer — editable */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">
          {/* Status radio */}
          <div>
            <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-2">Status</p>
            <div className="flex items-center flex-wrap gap-5">
              {(["none", "drop", "dnp", "add_to_pd"] as const).map((val) => (
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
                    {val === "none" ? "None" : val === "drop" ? "Drop" : val === "dnp" ? "Did Not Pick Up" : "Add to Parent Discovery"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-rise-brown/70 space-y-1.5 border-t border-gray-100 pt-3">
            <p>
              <span className="font-semibold text-rise-brown">Did Not Pick Up:</span> Mark this if the person didn&apos;t answer your call. They will be ready to call again tomorrow.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Drop:</span> This person will be removed from the pipeline. Please confirm with the team before marking anyone as Drop.
            </p>
            <p>
              <span className="font-semibold text-rise-brown">Add to Parent Discovery:</span> Marks this lead as Interested and creates a new record in the Parent Discovery table.
            </p>
          </div>

          {applicant.outreachNotes2025 && (
            <div>
              <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
                Previous Notes
              </label>
              <textarea
                readOnly
                value={applicant.outreachNotes2025}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black bg-gray-50 resize-none cursor-default focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
              Add Call Notes
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={3}
              disabled={status === "dnp"}
              placeholder="Add notes for this call…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50"
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

export default function PendingOutreachClient({
  applicants,
  userName,
}: {
  applicants: PendingOutreachApplicant[];
  userName: string;
}) {
  const [selected, setSelected] = useState<PendingOutreachApplicant | null>(null);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [idSort, setIdSort] = useState<"asc" | "desc" | null>("asc");
  const [toast, setToast] = useState<"saved" | "pd" | null>(null);

  function handleSaved(addedToPd: boolean) {
    setToast(addedToPd ? "pd" : "saved");
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = applicants
    .filter((a) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.studentEmail.toLowerCase().includes(q) ||
        a.applicantId.toLowerCase().includes(q);
      const matchesRegion = !region || getRegion(a.country.trim()) === region;
      return matchesQuery && matchesRegion;
    })
    .sort((a, b) => {
      if (idSort === "asc") return a.applicantId.localeCompare(b.applicantId);
      if (idSort === "desc") return b.applicantId.localeCompare(a.applicantId);
      return 0;
    });

  if (applicants.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        No students pending outreach.
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rise-green text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          {toast === "pd"
            ? "Added to Parent Discovery — marked as Interested"
            : "Changes saved — Last Call Date set to today"}
        </div>
      )}
      {selected && (
        <Modal
          applicant={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          userName={userName}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or applicant ID…"
          className="w-full sm:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Student Email
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
                  No results{query || region ? " for current filters" : ""}
                </td>
              </tr>
            ) : (
              filtered.map((applicant) => (
                <tr key={applicant.recordId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-rise-brown">{applicant.applicantId}</td>
                  <td className="px-4 py-3 font-medium text-rise-black">{applicant.name}</td>
                  <td className="px-4 py-3 text-rise-brown">{applicant.studentEmail || "—"}</td>
                  <td className="px-4 py-3 text-rise-brown">{applicant.country || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(applicant)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-rise-green hover:text-rise-green/80 transition-colors"
                      aria-label={`Open details for ${applicant.name}`}
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

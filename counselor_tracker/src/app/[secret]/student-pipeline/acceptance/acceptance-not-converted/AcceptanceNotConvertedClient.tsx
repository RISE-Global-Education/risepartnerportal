"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AcceptanceNotConvertedApplicant } from "./page";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde (Cape Verde)","Cambodia","Cameroon","Canada","Cayman Islands","Central African Republic","Chad","Chile","China","Colombia","Comoros","Cook Islands","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","East Timor (Timor-Leste)","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini (Swaziland)","Ethiopia","Fiji","Finland","France","Gabon","Gaza Strip","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Other","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Republic of the Congo","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","The Bahamas","The Gambia","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","West Bank","Yemen","Zambia","Zimbabwe",
];

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
}: {
  applicant: AcceptanceNotConvertedApplicant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [callNotes, setCallNotes] = useState(applicant.paymentCallNotes);
  const [status, setStatus] = useState<"none" | "drop" | "dnp">("none");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const today = new Date().toISOString();

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        paymentCallNotes: callNotes,
        lastCallDate: today,
      };
      if (status === "drop") {
        body.followUpStatus = "Drop";
      } else if (status === "dnp") {
        body.incrementDnp = true;
        body.paymentCallNotes = callNotes.trim() ? callNotes.trimEnd() + "\ndnp" : "dnp";
      }

      const res = await fetch(`/api/student-pipeline/${applicant.recordId}`, {
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
            {applicant.acceptanceSentTime && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Acceptance Sent</dt>
                <dd className="text-sm text-rise-black">{formatDate(applicant.acceptanceSentTime)}</dd>
              </div>
            )}
            {applicant.interviewDate && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Interview Date</dt>
                <dd className="text-sm text-rise-black">{formatDate(applicant.interviewDate)}</dd>
              </div>
            )}
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

          {/* Application responses */}
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
          {/* Shortlisting Call Notes */}
          <div>
            <label className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1 block">
              Payment Call Notes
            </label>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={4}
              placeholder="Please add your call notes here with what was discussed in the call. If the person did not pick up, please mark them 'Did Not Pick Up' at the bottom."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40 resize-none"
            />
          </div>

          {/* Status radio */}
          <div>
            <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-2">Status</p>
            <div className="flex items-center gap-5">
              {(["none", "drop", "dnp"] as const).map((val) => (
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
                    {val === "none" ? "None" : val === "drop" ? "Drop" : "Did Not Pick Up"}
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

export default function AcceptanceNotConvertedClient({
  applicants,
}: {
  applicants: AcceptanceNotConvertedApplicant[];
}) {
  const [selected, setSelected] = useState<AcceptanceNotConvertedApplicant | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [toast, setToast] = useState(false);

  function handleSaved() {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  const filtered = applicants.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.studentEmail.toLowerCase().includes(q) ||
      a.applicantId.toLowerCase().includes(q);
    const matchesCountry = !country || a.country.trim() === country;
    return matchesQuery && matchesCountry;
  });

  if (applicants.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        No applicants pending conversion.
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rise-green text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          Changes saved — Last Call Date set to today
        </div>
      )}
      {selected && (
        <Modal
          applicant={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
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
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <a
          href="https://docs.google.com/document/d/1LiVJyi05C1bDaoW7hNg4y2BDa_8V3PUxF3-9dmZABkU/edit?tab=t.q84zp926nf25"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-rise-brown hover:text-rise-black hover:border-gray-400 transition-colors"
        >
          Calling Script
        </a>
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
                  No results{query || country ? " for current filters" : ""}
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

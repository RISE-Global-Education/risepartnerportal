"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import type { ShortlistApplicant } from "./page";

const CALL_STATUS_OPTIONS = ["Done", "Did Not Pick", "Pending", "NA"] as const;

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
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
  applicant,
  secret,
  onClose,
}: {
  applicant: ShortlistApplicant;
  secret: string;
  onClose: () => void;
}) {
  const [callStatus, setCallStatus] = useState(applicant.callStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleCallStatusChange(value: string) {
    const newVal = callStatus === value ? "" : value;
    setCallStatus(newVal);
    setSaved(false);
    setSaving(true);
    try {
      await fetch(`/api/student-pipeline/${applicant.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-dashboard-secret": secret },
        body: JSON.stringify({ callStatus: newVal }),
      });
      setSaved(true);
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
            <h2 className="font-heading font-bold text-rise-black text-base">{applicant.name}</h2>
            <p className="text-xs text-rise-brown mt-0.5">{applicant.applicantId}</p>
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
          {/* Shortlist info */}
          <section className="mb-6 bg-rise-cream rounded-lg px-4 py-3 flex flex-wrap gap-4">
            <div>
              <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Follow Up Status</dt>
              <dd className="text-sm font-medium text-rise-green">{applicant.followUpStatus}</dd>
            </div>
            {applicant.shortlistSentTime && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Shortlist Sent</dt>
                <dd className="text-sm text-rise-black">{formatDateTime(applicant.shortlistSentTime)}</dd>
              </div>
            )}
            {applicant.acceptanceSentTime && (
              <div>
                <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Acceptance Sent Time</dt>
                <dd className="text-sm text-rise-black">{formatDateTime(applicant.acceptanceSentTime)}</dd>
              </div>
            )}
          </section>

          {/* Applicant details */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
              Applicant Details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Applicant ID" value={applicant.applicantId} />
              <DetailRow label="Name" value={applicant.name} />
              <DetailRow label="Phone Number" value={applicant.phone} />
              <DetailRow label="Current Grade" value={applicant.currentGrade} />
              <DetailRow label="School / College" value={applicant.schoolCollege} />
              <DetailRow label="City" value={applicant.city} />
              <DetailRow label="Country" value={applicant.country} />
              <DetailRow label="Cohort" value={applicant.cohort} />
              <DetailRow label="Research Package" value={applicant.researchPackage} />
              <DetailRow label="Previously Applied to RISE?" value={applicant.previouslyApplied} />
              <DetailRow label="Academic Score" value={applicant.academicScore} />
              <DetailRow label="Standardized Test Scores" value={applicant.testScores} />
              <DetailRow label="How Did They Hear About Us?" value={applicant.howHeard} />
              <DetailRow label="Referral Detail" value={applicant.howHeardDetail} />
            </dl>
          </section>

          {applicant.fieldsOfInterest && (
            <section className="mb-4">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                Field(s) of Interest
              </h3>
              <p className="text-sm text-rise-black">{applicant.fieldsOfInterest}</p>
            </section>
          )}

          {applicant.motivation && (
            <section className="mb-4">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                Motivation
              </h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{applicant.motivation}</p>
            </section>
          )}

          {applicant.priorExperience && (
            <section className="mb-4">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-1">
                Prior Experience / Relevant Coursework
              </h3>
              <p className="text-sm text-rise-black whitespace-pre-wrap">{applicant.priorExperience}</p>
            </section>
          )}

          {/* Interview info (read-only) */}
          {(applicant.interviewDate || applicant.notes) && (
            <section className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
                Interview
              </h3>
              <dl className="flex flex-col gap-3">
                {applicant.interviewDate && (
                  <div>
                    <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Interview Date</dt>
                    <dd className="text-sm text-rise-black">{applicant.interviewDate}</dd>
                  </div>
                )}
                {applicant.notes && (
                  <div>
                    <dt className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-0.5">Interview Notes</dt>
                    <dd className="text-sm text-rise-black whitespace-pre-wrap">{applicant.notes}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="mb-3">
            <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-2">
              Call Status
            </p>
            <div className="flex flex-wrap gap-2">
              {CALL_STATUS_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                    callStatus === option
                      ? "bg-rise-green text-white border-rise-green"
                      : "bg-white text-rise-brown border-gray-200 hover:border-rise-green hover:text-rise-green"
                  }`}
                >
                  <input
                    type="radio"
                    name={`callStatus-${applicant.recordId}`}
                    value={option}
                    checked={callStatus === option}
                    onChange={() => handleCallStatusChange(option)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
              {callStatus && (
                <button
                  onClick={() => handleCallStatusChange(callStatus)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-400 hover:text-rise-brown hover:border-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
              {saving && <span className="text-xs text-rise-brown self-center">Saving…</span>}
              {saved && !saving && <span className="text-xs text-rise-green self-center">Saved</span>}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-rise-brown hover:text-rise-black transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTERS = ["SWA1", "SWA2", "SWA3", "Call Shortlisting"] as const;

export default function ShortlistingClient({
  applicants,
  statusFilters = STATUS_FILTERS as unknown as string[],
  emptyMessage = "No applicants in shortlisting stage.",
}: {
  applicants: ShortlistApplicant[];
  statusFilters?: string[];
  emptyMessage?: string;
}) {
  const params = useParams<{ secret: string }>();
  const secret = params.secret ?? "";
  const [selected, setSelected] = useState<ShortlistApplicant | null>(null);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const filtered = applicants.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.applicantId.toLowerCase().includes(q);
    const matchesStatus = !activeStatus || a.followUpStatus === activeStatus;
    return matchesQuery && matchesStatus;
  });

  if (applicants.length === 0) {
    return (
      <div className="text-center py-16 text-rise-brown text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or applicant ID…"
          className="w-full sm:w-72 border border-gray-200 rounded-lg px-3 py-2 text-sm text-rise-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rise-green/40"
        />
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(activeStatus === status ? null : status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeStatus === status
                  ? "bg-rise-green text-white"
                  : "bg-white border border-gray-200 text-rise-brown hover:border-rise-green hover:text-rise-green"
              }`}
            >
              {status}
              <span className="ml-1.5 opacity-70">
                {applicants.filter((a) => a.followUpStatus === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Applicant ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-rise-brown uppercase tracking-wide">
                Status
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
            ) : filtered.map((applicant) => (
              <tr key={applicant.recordId} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-rise-brown">
                  {applicant.applicantId}
                </td>
                <td className="px-4 py-3 font-medium text-rise-black">{applicant.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-block text-xs font-medium bg-rise-green/10 text-rise-green rounded-full px-2 py-0.5">
                    {applicant.followUpStatus}
                  </span>
                </td>
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
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal applicant={selected} secret={secret} onClose={() => setSelected(null)} />
      )}

    </>
  );
}

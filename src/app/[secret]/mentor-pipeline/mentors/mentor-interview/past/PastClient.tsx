"use client";

import { useState } from "react";
import type { MatchedMentor, UnmatchedMentor, ContractStatusLabel } from "./page";
import ContractPopup from "@/components/mentor/ContractPopup";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

<<<<<<< Updated upstream
function StatusBadge({ status }: { status: ContractStatusLabel }) {
  const styles: Record<ContractStatusLabel, string> = {
    "Completed":         "bg-blue-100 text-blue-700",
    "Contract Sent":     "bg-green-100 text-green-700",
    "Send Contract":     "bg-yellow-100 text-yellow-700",
    "Not Needed":        "bg-gray-100 text-gray-500",
    "Contract Not Sent": "bg-red-100 text-red-600",
=======
function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: PastInterview[]): string {
  const header = ["Name", "Email", "Booking Time (UTC)", "Status"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.mentorName, r.mentorEmail, formatDateTime(r.bookingStart), r.contractStatus.label]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadSectionCsv(title: string, rows: PastInterview[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: ContractStatusInfo }) {
  const styles: Record<ContractStatusTone, string> = {
    "completed": "bg-blue-100 text-blue-700",
    "sent":      "bg-green-100 text-green-700",
    "pending":   "bg-yellow-100 text-yellow-700",
    "not-sent":  "bg-red-100 text-red-600",
>>>>>>> Stashed changes
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function UndertakingBadge({ uploaded }: { uploaded: boolean }) {
  return uploaded ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Uploaded</span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Missing</span>
  );
}


export default function PastClient({
  matched,
  unmatched,
}: {
  matched: MatchedMentor[];
  unmatched: UnmatchedMentor[];
}) {
  const [query, setQuery] = useState("");
  const [contractTarget, setContractTarget] = useState<{ name: string; email: string } | null>(null);


  const filteredMatched = query.trim()
    ? matched.filter((r) =>
        r.mentorName.toLowerCase().includes(query.toLowerCase()) ||
        r.hostName.toLowerCase().includes(query.toLowerCase())
      )
    : matched;

  const filteredUnmatched = query.trim()
    ? unmatched.filter((r) =>
        r.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
        r.attendeeEmail.toLowerCase().includes(query.toLowerCase())
      )
    : unmatched;

  return (
    <div className="space-y-10">
      {contractTarget && (
        <ContractPopup
          initialName={contractTarget.name}
          initialEmail={contractTarget.email}
          onClose={() => setContractTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-rise-brown">
            <tr>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Mentor Name</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Booking Time (UTC)</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Contract Status</th>
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Undertaking</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMatched.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-rise-brown">
                  No past interviews found.
                </td>
              </tr>
            ) : (
              filteredMatched.map((r) => (
                <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-rise-black">{r.mentorName}</td>
                  <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                  <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                    {formatDateTime(r.bookingStart)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.contractStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <UndertakingBadge uploaded={r.undertakingUploaded} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setContractTarget({ name: r.mentorName, email: r.mentorEmail })}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-md px-3 py-1 transition-colors whitespace-nowrap"
                    >
                      Send Contract
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

<<<<<<< Updated upstream
      {unmatched.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rise-black mb-3">
            Mentors not present in the pipeline
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-rise-brown">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee Name</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Booking Time (UTC)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnmatched.map((r) => (
                  <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-rise-black">{r.attendeeName}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.attendeeEmail}</td>
                    <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                    <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                      {formatDateTime(r.bookingStart)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setContractTarget({ name: r.attendeeName, email: r.attendeeEmail })}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-md px-3 py-1 transition-colors whitespace-nowrap"
                      >
                        Send Contract
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
=======
        return (
          <div key={section.tone}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-rise-black">
                {section.title}{" "}
                <span className="text-rise-brown font-normal">({filtered.length})</span>
              </h3>
              <button
                onClick={() => downloadSectionCsv(section.title, filtered)}
                disabled={filtered.length === 0}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-md px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300"
              >
                Download CSV
              </button>
            </div>
            <SectionTable
              interviews={filtered}
              showStatusColumn={section.tone === "pending"}
              onSendContract={setContractTarget}
            />
>>>>>>> Stashed changes
          </div>
        </div>
      )}
    </div>
  );
}

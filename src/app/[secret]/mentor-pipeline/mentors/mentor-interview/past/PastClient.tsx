"use client";

import { useState } from "react";
import type { PastSection, PastInterview, ContractStatusInfo, ContractStatusTone } from "./page";
import ContractPopup from "@/components/mentor/ContractPopup";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function StatusBadge({ status }: { status: ContractStatusInfo }) {
  const styles: Record<ContractStatusTone, string> = {
    "completed": "bg-blue-100 text-blue-700",
    "sent":      "bg-green-100 text-green-700",
    "pending":   "bg-yellow-100 text-yellow-700",
    "not-sent":  "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status.tone]}`}>
      {status.label}
    </span>
  );
}

function SectionTable({
  interviews,
  showStatusColumn,
  onSendContract,
}: {
  interviews: PastInterview[];
  showStatusColumn: boolean;
  onSendContract: (target: { name: string; email: string }) => void;
}) {
  const colCount = showStatusColumn ? 5 : 4;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-rise-brown">
          <tr>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Mentor Name</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Booking Time (UTC)</th>
            {showStatusColumn && (
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Contract Status</th>
            )}
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Rate</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {interviews.length === 0 ? (
            <tr>
              <td colSpan={colCount + 1} className="px-4 py-6 text-center text-rise-brown">
                No mentors found.
              </td>
            </tr>
          ) : (
            interviews.map((r) => (
              <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-rise-black">{r.mentorName}</td>
                <td className="px-4 py-3 text-rise-brown">{r.hostName}</td>
                <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                  {formatDateTime(r.bookingStart)}
                </td>
                {showStatusColumn && (
                  <td className="px-4 py-3">
                    <StatusBadge status={r.contractStatus} />
                  </td>
                )}
                <td className="px-4 py-3 text-rise-brown whitespace-nowrap">
                  {r.rate || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSendContract({ name: r.mentorName, email: r.mentorEmail })}
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
  );
}

export default function PastClient({ sections }: { sections: PastSection[] }) {
  const [query, setQuery] = useState("");
  const [contractTarget, setContractTarget] = useState<{ name: string; email: string } | null>(null);

  const matches = (r: PastInterview) =>
    !query.trim() ||
    r.mentorName.toLowerCase().includes(query.toLowerCase()) ||
    r.hostName.toLowerCase().includes(query.toLowerCase());

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

      {sections.map((section) => {
        const filtered = section.interviews.filter(matches);
        if (query.trim() && filtered.length === 0) return null;

        return (
          <div key={section.tone}>
            <h3 className="text-sm font-semibold text-rise-black mb-3">
              {section.title}{" "}
              <span className="text-rise-brown font-normal">({filtered.length})</span>
            </h3>
            <SectionTable
              interviews={filtered}
              showStatusColumn={section.tone === "pending"}
              onSendContract={setContractTarget}
            />
          </div>
        );
      })}
    </div>
  );
}

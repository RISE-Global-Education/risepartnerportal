"use client";

import { useState } from "react";
import type { PastWCSection, PastWCBooking, ContractStatusInfo, ContractStatusTone } from "./page";
import WCDetailPopup from "@/components/mentor/WCDetailPopup";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: PastWCBooking[]): string {
  const header = ["Name", "Email", "Booking Time (UTC)", "Status"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.attendeeName, r.attendeeEmail, formatDateTime(r.start), r.contractStatus.label]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadSectionCsv(title: string, rows: PastWCBooking[]) {
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
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status.tone]}`}>
      {status.label}
    </span>
  );
}

function SectionTable({
  bookings,
  showStatusColumn,
  onSelect,
}: {
  bookings: PastWCBooking[];
  showStatusColumn: boolean;
  onSelect: (booking: PastWCBooking) => void;
}) {
  const colCount = showStatusColumn ? 6 : 5;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-rise-brown">
          <tr>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Attendee</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">University</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Host</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Time (UTC)</th>
            {showStatusColumn && (
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Contract Status</th>
            )}
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Rate</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={colCount + 1} className="px-4 py-6 text-center text-rise-brown">
                No candidates found.
              </td>
            </tr>
          ) : (
            bookings.map((b) => (
              <tr key={b.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-rise-black">{b.attendeeName}</td>
                <td className="px-4 py-3 text-rise-brown">
                  {b.university ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-rise-brown">{b.hostName}</td>
                <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{formatDateTime(b.start)}</td>
                {showStatusColumn && (
                  <td className="px-4 py-3">
                    <StatusBadge status={b.contractStatus} />
                  </td>
                )}
                <td className="px-4 py-3 text-rise-brown whitespace-nowrap">{b.rate || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelect(b)}
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
  );
}

export default function PastWCClient({ sections }: { sections: PastWCSection[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PastWCBooking | null>(null);

  const matches = (b: PastWCBooking) =>
    !query.trim() ||
    b.attendeeName.toLowerCase().includes(query.toLowerCase()) ||
    b.attendeeEmail.toLowerCase().includes(query.toLowerCase()) ||
    (b.university ?? "").toLowerCase().includes(query.toLowerCase());

  return (
    <div className="space-y-10">
      {selected && (
        <WCDetailPopup
          booking={selected}
          hasApplication={selected.hasApplication}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by name, email or university..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rise-green"
        />
      </div>

      {sections.map((section) => {
        const filtered = section.bookings.filter(matches);
        if (query.trim() && filtered.length === 0) return null;

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
              bookings={filtered}
              showStatusColumn={section.tone === "pending"}
              onSelect={setSelected}
            />
          </div>
        );
      })}
    </div>
  );
}

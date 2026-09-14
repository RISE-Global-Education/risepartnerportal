"use client";

import { useState } from "react";

export interface FollowUpPartner {
  counselorRecordId: string;
  companyName: string;
  risePoc: string[];
  latestDate: string; // "" = never contacted
  days: number | null; // null = never contacted
}

const RANGE_OPTIONS = [
  { value: "14", label: "14 days", days: 14 },
  { value: "30", label: "30 days", days: 30 },
  { value: "60", label: "60 days", days: 60 },
  { value: "90", label: "90 days", days: 90 },
  { value: "182", label: "6 months", days: 182 },
  { value: "365", label: "1 year", days: 365 },
  { value: "730", label: "2 years", days: 730 },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function NeedsFollowUp({
  partners,
  onLogConversation,
  onSelectPartner,
}: {
  partners: FollowUpPartner[];
  onLogConversation: (partner: FollowUpPartner) => void;
  onSelectPartner: (counselorRecordId: string) => void;
}) {
  const [range, setRange] = useState<RangeValue>("14");
  const selected = RANGE_OPTIONS.find((o) => o.value === range)!;

  const overdue = partners.filter((p) => p.days === null || p.days >= selected.days);
  const scrollable = overdue.length > 8;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-rise-black">Needs Follow-Up</h2>
            <span
              className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-md ${
                overdue.length > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {overdue.length}
            </span>
          </div>
          <p className="text-xs text-rise-brown mt-0.5">
            Partners not contacted in the last {selected.label} — so your team knows who to chase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-rise-brown">Not contacted in:</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeValue)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-rise-black focus:outline-none focus:ring-2 focus:ring-rise-green/30"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}+
              </option>
            ))}
          </select>
        </div>
      </div>

      {overdue.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center text-center gap-2">
          <span className="text-green-600">
            <CheckIcon />
          </span>
          <p className="text-sm font-medium text-rise-black">All caught up</p>
          <p className="text-xs text-rise-brown">
            Every active partner has been contacted in the last {selected.label}.
          </p>
        </div>
      ) : (
        <div className={scrollable ? "max-h-96 overflow-y-auto" : undefined}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-2.5 font-medium text-rise-brown w-12">S.No</th>
                <th className="px-5 py-2.5 font-medium text-rise-brown">Partner</th>
                <th className="px-5 py-2.5 font-medium text-rise-brown">Owner</th>
                <th className="px-5 py-2.5 font-medium text-rise-brown">Last Contact</th>
                <th className="px-5 py-2.5 font-medium text-rise-brown">Days</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {overdue.map((p, i) => (
                <tr
                  key={p.counselorRecordId}
                  onClick={() => onSelectPartner(p.counselorRecordId)}
                  className="border-b border-gray-50 last:border-0 hover:bg-rise-cream/40 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-2.5 text-rise-brown">{i + 1}</td>
                  <td className="px-5 py-2.5 font-medium text-rise-black">{p.companyName}</td>
                  <td className="px-5 py-2.5">
                    {p.risePoc.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.risePoc.map((rep) => (
                          <span
                            key={rep}
                            className="px-1.5 py-0.5 text-[11px] rounded-full bg-rise-cream text-rise-brown"
                          >
                            {rep}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-rise-brown">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-rise-brown">
                    {p.latestDate ? formatDate(p.latestDate) : <span className="text-red-400">Never</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    {p.days === null ? (
                      <span className="text-red-500 font-medium">—</span>
                    ) : (
                      <span className={`font-medium ${p.days >= 30 ? "text-red-500" : "text-amber-500"}`}>
                        {p.days}d
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLogConversation(p);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-rise-green/10 text-rise-green rounded-lg hover:bg-rise-green/20 transition-colors"
                    >
                      Log conversation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

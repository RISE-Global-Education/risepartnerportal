"use client";

import { useState, useMemo } from "react";
import type { MixmaxRecipient } from "@/app/api/mixmax/route";

type SortKey = "sent" | "opened" | "clicked" | "replied" | "lastSentAt";

function fmt(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InsightsTable({
  recipients,
}: {
  recipients: MixmaxRecipient[];
}) {
  const sequences = useMemo(
    () => ["All", ...Array.from(new Set(recipients.map((r) => r.sequenceName ?? "Unknown"))).sort()],
    [recipients]
  );

  const [activeSeq, setActiveSeq] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("sent");
  const [sortDesc, setSortDesc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const filtered = useMemo(() => {
    const base = activeSeq === "All"
      ? recipients
      : recipients.filter((r) => (r.sequenceName ?? "Unknown") === activeSeq);

    return [...base].sort((a, b) => {
      const av = sortKey === "lastSentAt" ? (a.lastSentAt ?? 0) : a[sortKey];
      const bv = sortKey === "lastSentAt" ? (b.lastSentAt ?? 0) : b[sortKey];
      return sortDesc ? bv - av : av - bv;
    });
  }, [recipients, activeSeq, sortKey, sortDesc]);

  const totals = useMemo(() => ({
    sent: filtered.reduce((s, r) => s + r.sent, 0),
    opened: filtered.reduce((s, r) => s + r.opened, 0),
    clicked: filtered.reduce((s, r) => s + r.clicked, 0),
    replied: filtered.reduce((s, r) => s + r.replied, 0),
  }), [filtered]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>;
  }

  function SortTh({ col, label, className = "text-right" }: { col: SortKey; label: string; className?: string }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide cursor-pointer select-none hover:text-rise-black ${className}`}
        onClick={() => toggleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    );
  }

  return (
    <section className="mt-8 pb-8">
      <div className="flex flex-wrap gap-2 mb-4">
        {sequences.map((seq) => (
          <button
            key={seq}
            onClick={() => setActiveSeq(seq)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeSeq === seq
                ? "bg-rise-black text-white border-rise-black"
                : "bg-white text-rise-brown border-gray-200 hover:border-gray-400"
            }`}
          >
            {seq}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide">
          Recipients ({filtered.length})
          {activeSeq !== "All" && (
            <span className="ml-2 font-normal normal-case text-rise-brown/60">
              · {activeSeq}
            </span>
          )}
        </h2>
        <div className="hidden sm:flex gap-4 text-xs text-rise-brown">
          <span><span className="font-semibold text-rise-black">{totals.sent}</span> sent</span>
          <span><span className="font-semibold text-amber-700">{totals.opened}</span> opened</span>
          <span><span className="font-semibold text-purple-700">{totals.clicked}</span> clicked</span>
          <span><span className="font-semibold text-emerald-700">{totals.replied}</span> replied</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-rise-brown">No recipients in this sequence.</p>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide">
                    Recipient
                  </th>
                  {activeSeq === "All" && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide">
                      Sequence
                    </th>
                  )}
                  <SortTh col="sent" label="Sent" />
                  <SortTh col="opened" label="Opened" />
                  <SortTh col="clicked" label="Clicked" />
                  <SortTh col="replied" label="Replied" />
                  <th className="text-right px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide">
                    Open Rate
                  </th>
                  <SortTh col="lastSentAt" label="Last Sent" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const rate = r.sent > 0 ? Math.round((r.opened / r.sent) * 100) : 0;
                  return (
                    <tr
                      key={`${r.email}-${r.sequenceName}-${i}`}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-rise-black">{r.name || "—"}</p>
                        <p className="text-xs text-rise-brown">{r.email}</p>
                      </td>
                      {activeSeq === "All" && (
                        <td className="px-4 py-3 text-rise-brown text-xs max-w-[180px] truncate">
                          {r.sequenceName ?? "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-rise-black">{r.sent}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{r.opened}</td>
                      <td className="px-4 py-3 text-right text-purple-700">{r.clicked}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{r.replied}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                            rate >= 50
                              ? "bg-emerald-100 text-emerald-700"
                              : rate >= 25
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-rise-brown whitespace-nowrap">
                        {fmt(r.lastSentAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

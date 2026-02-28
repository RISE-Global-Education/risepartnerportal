"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { MappedRow } from "./page";
import RefreshButton from "@/app/dashboard/[secret]/insights/mixmax/RefreshButton";

type CohortFilter = "All" | "NotSent" | "SentNotOpened" | "OpenedNotReplied" | "Replied";
type SortKey = "studentName" | "parentEmail" | "sequenceName" | "sent" | "opened" | "replied";

function matchesCohort(r: MappedRow, cohort: CohortFilter): boolean {
  if (cohort === "All") return true;
  if (cohort === "NotSent") return r.sequenceName === null || (r.sent ?? 0) === 0;
  if (cohort === "SentNotOpened") return (r.sent ?? 0) > 0 && (r.opened ?? 0) === 0;
  if (cohort === "OpenedNotReplied") return (r.sent ?? 0) > 0 && (r.opened ?? 0) > 0 && (r.replied ?? 0) === 0;
  if (cohort === "Replied") return (r.replied ?? 0) > 0;
  return true;
}

function formatCachedAt(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) + " IST";
}

export default function ParentsDiscoveryFormClient({
  rows,
  days,
  mixmaxCachedAt,
  fetchedAt,
}: {
  rows: MappedRow[];
  days: 30 | 60 | 90;
  mixmaxCachedAt: string | null;
  fetchedAt: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<CohortFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("studentName");
  const [sortDesc, setSortDesc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key === "sent" || key === "opened" || key === "replied");
    }
  }

  const filtered = useMemo(() => {
    let base = rows;
    if (cohortFilter !== "All") base = base.filter((r) => matchesCohort(r, cohortFilter));
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.parentEmail.toLowerCase().includes(q)
      );
    }

    return [...base].sort((a, b) => {
      if (sortKey === "sent" || sortKey === "opened" || sortKey === "replied") {
        const av = a[sortKey] ?? -1;
        const bv = b[sortKey] ?? -1;
        return sortDesc ? bv - av : av - bv;
      }
      const av = (sortKey === "sequenceName" ? (a.sequenceName ?? "—") : a[sortKey]) ?? "";
      const bv = (sortKey === "sequenceName" ? (b.sequenceName ?? "—") : b[sortKey]) ?? "";
      const cmp = (av as string).localeCompare(bv as string);
      return sortDesc ? -cmp : cmp;
    });
  }, [rows, cohortFilter, search, sortKey, sortDesc]);

  // Summary counts — de-duped by recordId
  const uniqueRecords = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof rows = [];
    for (const r of rows) {
      if (!seen.has(r.recordId)) { seen.add(r.recordId); out.push(r); }
    }
    return out;
  }, [rows]);

  const total = uniqueRecords.length;
  const notSentAll = uniqueRecords.filter((r) => matchesCohort(r, "NotSent")).length;
  const sentNotOpenedAll = uniqueRecords.filter((r) => matchesCohort(r, "SentNotOpened")).length;
  const sentNotRepliedAll = uniqueRecords.filter((r) => matchesCohort(r, "OpenedNotReplied")).length;
  const repliedAll = uniqueRecords.filter((r) => matchesCohort(r, "Replied")).length;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 opacity-25">↕</span>;
    return <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>;
  }

  function Th({ col, label, align = "left" }: { col: SortKey; label: string; align?: "left" | "right" }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide cursor-pointer select-none hover:text-rise-black text-${align}`}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  const COHORT_CARDS: { key: CohortFilter; label: string; count: number; bg: string; text: string; ring: string }[] = [
    { key: "NotSent",          label: "Not Sent",            count: notSentAll,       bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-400" },
    { key: "SentNotOpened",    label: "Sent, Not Opened",    count: sentNotOpenedAll, bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-400" },
    { key: "OpenedNotReplied", label: "Opened, Not Replied", count: sentNotRepliedAll,bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-400" },
    { key: "Replied",          label: "Replied",             count: repliedAll,       bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold text-rise-black font-heading">Parents Discovery — Application Form</h1>
          <p className="text-xs text-rise-brown mt-0.5">
            Discovery Call rows where Student Application Form = "Form Sent" × Mixmax sequence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => router.push(`${pathname}?days=${d}`)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  days === d
                    ? "bg-rise-black text-white border-rise-black"
                    : "bg-white text-rise-brown border-gray-200 hover:border-gray-400"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <RefreshButton apiPath="/api/refresh/parents-discovery-form" />
        </div>
      </div>

      <p className="text-xs text-rise-brown/60 mb-6">
        Last updated: <span className="font-medium text-rise-brown">{formatCachedAt(fetchedAt)}</span>
        {mixmaxCachedAt && (
          <> · Mixmax: <span className="font-medium text-rise-brown">{formatCachedAt(mixmaxCachedAt)}</span></>
        )}
      </p>

      {/* Overview cards */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">
          Overview · {total} records
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COHORT_CARDS.map(({ key, label, count, bg, text, ring }) => (
            <button
              key={key}
              onClick={() => setCohortFilter(cohortFilter === key ? "All" : key)}
              className={`${bg} rounded-xl p-4 text-left transition-all cursor-pointer ${
                cohortFilter === key ? `ring-2 ${ring}` : "hover:opacity-80"
              }`}
            >
              <p className={`text-xs font-medium ${text} opacity-70 uppercase tracking-wide`}>{label}</p>
              <p className={`text-3xl font-bold ${text} mt-1`}>{count}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search student name or parent email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder:text-rise-brown/50 focus:outline-none focus:ring-2 focus:ring-rise-green/30 w-full sm:w-72"
        />
      </div>

      {/* Table */}
      <p className="text-xs text-rise-brown mb-2">{filtered.length} rows</p>

      {filtered.length === 0 ? (
        <p className="text-sm text-rise-brown">No results match the current filters.</p>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <Th col="studentName" label="Student Name" />
                  <Th col="parentEmail" label="Parent Email" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-rise-brown uppercase tracking-wide">
                    Email Status
                  </th>
                  <Th col="sequenceName" label="Sequence" />
                  <Th col="sent" label="Sent" align="right" />
                  <Th col="opened" label="Opened" align="right" />
                  <Th col="replied" label="Replied" align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const emailSent = r.sequenceName !== null && (r.sent ?? 0) > 0;
                  return (
                    <tr
                      key={`${r.recordId}-${r.sequenceName}-${i}`}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-rise-black whitespace-nowrap">
                        {r.studentName}
                      </td>
                      <td className="px-4 py-3 text-xs text-rise-brown">
                        {r.parentEmail || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                            emailSent
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {emailSent ? "Sent" : "Not Sent"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-rise-brown">
                        {r.sequenceName ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-rise-black">
                        {r.sent ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700">
                        {r.opened ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {r.replied ?? <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Conversation, ConversationIntent } from "@/lib/types";
import CalendarWidget from "./CalendarWidget";
import LogConversationForm from "./LogConversationForm";
import ColumnFilterDropdown, { type ColumnFilterValue } from "./ColumnFilterDropdown";
import PartnerDetailModal from "./PartnerDetailModal";
import NeedsFollowUp, { type FollowUpPartner } from "./NeedsFollowUp";

// Dead leads (Rejected / Unqualified) don't need chasing — every "who
// hasn't been contacted" view across the portal excludes them.
const HIDDEN_FOLLOWUP_STATUSES = new Set(["Rejected", "Unqualified"]);

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Sortable numeric value for a "latest contact" date where "" means never
// contacted — always sorts oldest (i.e. last when sorting newest-first).
function dateSortValue(dateStr: string): number {
  return dateStr ? new Date(dateStr).getTime() : -Infinity;
}

const INTENT_COLORS: Record<ConversationIntent, string> = {
  cold: "#3b82f6",
  neutral: "#f59e0b",
  warm: "#10b981",
};

const INTENT_LABELS: Record<ConversationIntent, string> = {
  cold: "Cold",
  neutral: "Neutral",
  warm: "Warm",
};

const INTENT_ORDER: ConversationIntent[] = ["cold", "neutral", "warm"];

const INTENT_RANK: Record<ConversationIntent, number> = { cold: 0, neutral: 1, warm: 2 };

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Airtable dates are plain "YYYY-MM-DD" — parse as local, not UTC, so a
// conversation doesn't shift a day depending on the viewer's timezone.
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKey(dateStr: string): string {
  const d = toLocalDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const CHART_RANGE_OPTIONS = [
  { value: "1", label: "Day", days: 1 },
  { value: "7", label: "7 Days", days: 7 },
  { value: "14", label: "14 Days", days: 14 },
  { value: "month", label: "Month", days: null },
] as const;

type ChartRange = (typeof CHART_RANGE_OPTIONS)[number]["value"];

interface PartnerJourney {
  counselorRecordId: string;
  companyName: string;
  conversations: Conversation[];
  latestIntent: ConversationIntent | null;
  latestDate: string;
  followUpStatus: string;
  risePoc: string[];
}

interface PartnerOption {
  id: string;
  companyName: string;
}

interface RosterEntry {
  id: string;
  companyName: string;
  risePoc: string[];
  followUpStatus: string;
  lastConversationDate: string | null;
}

export default function InsightsClient({
  conversations,
  partners,
  roster,
  secret,
}: {
  conversations: Conversation[];
  partners: PartnerOption[];
  roster: RosterEntry[];
  secret: string;
}) {
  const [query, setQuery] = useState("");
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logFormPartner, setLogFormPartner] = useState<PartnerOption | null>(null);
  const logFormRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"partners" | "calendar">("partners");
  const [chartRange, setChartRange] = useState<ChartRange>("7");
  const [columnFilters, setColumnFilters] = useState<{
    partner: ColumnFilterValue;
    intent: ColumnFilterValue;
    attendee: ColumnFilterValue;
    count: ColumnFilterValue;
    date: ColumnFilterValue;
  }>({ partner: null, intent: null, attendee: null, count: null, date: null });
  const [selectedPartner, setSelectedPartner] = useState<PartnerJourney | null>(null);
  const [sortKey, setSortKey] = useState<"date" | "name" | "intent" | "count">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const dated = useMemo(
    () => conversations.filter((c) => c.date && c.counselorRecordId),
    [conversations]
  );

  const chartData = useMemo(() => {
    if (chartRange === "month") {
      const buckets = new Map<string, Record<ConversationIntent, number>>();
      for (const c of dated) {
        const key = monthKey(c.date);
        if (!buckets.has(key)) buckets.set(key, { cold: 0, neutral: 0, warm: 0 });
        if (c.intent) buckets.get(key)![c.intent]++;
      }
      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, counts]) => ({ label: monthLabel(key), ...counts }));
    }

    // Day-granularity ranges: one bar per calendar day, oldest to today.
    const windowDays = CHART_RANGE_OPTIONS.find((o) => o.value === chartRange)!.days!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<string, Record<ConversationIntent, number>>();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(dayKey(d), { cold: 0, neutral: 0, warm: 0 });
    }
    for (const c of dated) {
      const key = dayKey(toLocalDate(c.date));
      const bucket = buckets.get(key);
      if (bucket && c.intent) bucket[c.intent]++;
    }
    return Array.from(buckets.entries()).map(([key, counts]) => ({ label: dayLabel(key), ...counts }));
  }, [dated, chartRange]);

  const journeys = useMemo(() => {
    const byPartner = new Map<string, PartnerJourney>();

    // Seed every partner in the roster first — including ones with zero
    // conversations logged in this app — so someone who has never been
    // contacted still shows up instead of being invisible.
    for (const c of roster) {
      byPartner.set(c.id, {
        counselorRecordId: c.id,
        companyName: c.companyName,
        conversations: [],
        latestIntent: null,
        latestDate: c.lastConversationDate || "",
        followUpStatus: c.followUpStatus,
        risePoc: c.risePoc,
      });
    }

    for (const c of dated) {
      const id = c.counselorRecordId!;
      if (!byPartner.has(id)) {
        // Defensive: a conversation whose counselor fell out of the roster
        // between fetches. Shouldn't happen — getAllConversations() only
        // returns conversations already joined to a live counselor.
        byPartner.set(id, {
          counselorRecordId: id,
          companyName: c.counselorName || c.companyName,
          conversations: [],
          latestIntent: null,
          latestDate: "",
          followUpStatus: "",
          risePoc: [],
        });
      }
      byPartner.get(id)!.conversations.push(c);
    }

    const result: PartnerJourney[] = [];
    for (const partner of byPartner.values()) {
      if (partner.conversations.length > 0) {
        partner.conversations.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const latest = partner.conversations[partner.conversations.length - 1];
        partner.latestIntent = latest.intent;
        // The conversation this page just logged is more current than the
        // counselor record's cached "Last Conversation Date".
        partner.latestDate = latest.date;
      }
      result.push(partner);
    }

    result.sort((a, b) => dateSortValue(b.latestDate) - dateSortValue(a.latestDate));
    return result;
  }, [dated, roster]);

  // Every active (non-dead-lead) partner, with days-since-contact computed.
  // NeedsFollowUp applies its own recency threshold on top of this pool.
  const activePartners = useMemo<FollowUpPartner[]>(() => {
    return journeys
      .filter((j) => !HIDDEN_FOLLOWUP_STATUSES.has(j.followUpStatus))
      .map((j) => ({
        counselorRecordId: j.counselorRecordId,
        companyName: j.companyName,
        risePoc: j.risePoc,
        latestDate: j.latestDate,
        days: j.latestDate ? daysSince(j.latestDate) : null,
      }))
      // Sorted by last contacted, ascending — oldest (and never-contacted)
      // first, so the most overdue partners lead the list.
      .sort((a, b) => dateSortValue(a.latestDate) - dateSortValue(b.latestDate));
  }, [journeys]);

  function openLogForm(partner?: PartnerOption) {
    setLogFormPartner(partner ?? null);
    setLogFormOpen(true);
    if (partner) {
      logFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const intentLabelOf = (intent: ConversationIntent | null) =>
    intent ? INTENT_LABELS[intent] : "—";

  function passesFilter(filter: ColumnFilterValue, value: string) {
    return filter === null || filter.has(value);
  }

  const partnerOptions = useMemo(
    () =>
      Array.from(new Set(journeys.map((j) => j.companyName))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [journeys]
  );

  const intentOptions = useMemo(() => {
    const present = new Set(journeys.map((j) => intentLabelOf(j.latestIntent)));
    const ordered = INTENT_ORDER.map((i) => INTENT_LABELS[i]).filter((l) => present.has(l));
    return present.has("—") ? [...ordered, "—"] : ordered;
  }, [journeys]);

  const countOptions = useMemo(
    () =>
      Array.from(new Set(journeys.map((j) => j.conversations.length)))
        .sort((a, b) => a - b)
        .map(String),
    [journeys]
  );

  const dateOptions = useMemo(
    () =>
      Array.from(new Set(journeys.map((j) => j.latestDate)))
        .sort((a, b) => dateSortValue(b) - dateSortValue(a))
        .map(formatDate),
    [journeys]
  );

  const attendeeOptions = useMemo(
    () =>
      Array.from(new Set(dated.map((c) => c.attendee).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [dated]
  );

  function passesAttendeeFilter(filter: ColumnFilterValue, partnerConversations: Conversation[]) {
    if (filter === null) return true;
    return partnerConversations.some((c) => c.attendee && filter.has(c.attendee));
  }

  const filteredJourneys = useMemo(() => {
    return journeys
      .filter((j) => {
        if (!query.trim()) return true;
        return j.companyName.toLowerCase().includes(query.trim().toLowerCase());
      })
      .filter((j) => passesFilter(columnFilters.partner, j.companyName))
      .filter((j) => passesFilter(columnFilters.intent, intentLabelOf(j.latestIntent)))
      .filter((j) => passesAttendeeFilter(columnFilters.attendee, j.conversations))
      .filter((j) => passesFilter(columnFilters.count, String(j.conversations.length)))
      .filter((j) => passesFilter(columnFilters.date, formatDate(j.latestDate)));
  }, [journeys, query, columnFilters]);

  function handleSort(key: "date" | "name" | "intent" | "count") {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sortIcon = (key: "date" | "name" | "intent" | "count") =>
    sortKey === key ? (sortDir === "desc" ? "▼" : "▲") : "⇅";

  const sortedJourneys = useMemo(() => {
    const copy = [...filteredJourneys];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = dateSortValue(a.latestDate) - dateSortValue(b.latestDate);
      } else if (sortKey === "name") {
        cmp = a.companyName.localeCompare(b.companyName);
      } else if (sortKey === "count") {
        cmp = a.conversations.length - b.conversations.length;
      } else if (sortKey === "intent") {
        const aRank = a.latestIntent ? INTENT_RANK[a.latestIntent] : -1;
        const bRank = b.latestIntent ? INTENT_RANK[b.latestIntent] : -1;
        cmp = aRank - bRank;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filteredJourneys, sortKey, sortDir]);

  const filteredConversations = useMemo(() => {
    return dated
      .filter((c) => {
        if (!query.trim()) return true;
        const name = c.counselorName || c.companyName;
        return name.toLowerCase().includes(query.trim().toLowerCase());
      })
      .filter((c) => passesFilter(columnFilters.partner, c.counselorName || c.companyName))
      .filter((c) => passesFilter(columnFilters.intent, intentLabelOf(c.intent)))
      .filter((c) => columnFilters.attendee === null || (!!c.attendee && columnFilters.attendee.has(c.attendee)));
  }, [dated, query, columnFilters]);

  const journeysById = useMemo(
    () => new Map(journeys.map((j) => [j.counselorRecordId, j])),
    [journeys]
  );

  function selectPartnerById(id: string) {
    const j = journeysById.get(id);
    if (j) setSelectedPartner(j);
  }

  const partnersTracked = journeys.length;

  const noConversationCount = useMemo(
    () => journeys.filter((j) => j.conversations.length === 0).length,
    [journeys]
  );

  // Has conversations logged, but the latest one didn't carry a parseable
  // Cold/Neutral/Warm tag (older data logged before intent tracking, or
  // notes that don't match the "Intent\nNotes: ..." format). Broken out on
  // its own so No Conversation + Untagged + Warm + Cold + Neutral always
  // sums to Total Partners.
  const untaggedCount = useMemo(
    () => journeys.filter((j) => j.conversations.length > 0 && !j.latestIntent).length,
    [journeys]
  );

  const intentCounts = useMemo(() => {
    const counts: Record<ConversationIntent, number> = { cold: 0, neutral: 0, warm: 0 };
    for (const j of journeys) {
      if (j.latestIntent) counts[j.latestIntent]++;
    }
    return counts;
  }, [journeys]);

  const pctOfPartners = (count: number) =>
    partnersTracked ? Math.round((count / partnersTracked) * 100) : 0;

  return (
    <div>
      <div ref={logFormRef}>
        <LogConversationForm
          partners={partners}
          secret={secret}
          open={logFormOpen}
          initialPartner={logFormPartner}
          onOpen={() => openLogForm()}
          onClose={() => setLogFormOpen(false)}
        />
      </div>

      <NeedsFollowUp
        partners={activePartners}
        onLogConversation={(p) =>
          openLogForm({ id: p.counselorRecordId, companyName: p.companyName })
        }
        onSelectPartner={selectPartnerById}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Partners" value={partnersTracked} />
        <StatCard
          label="No Conversation"
          value={noConversationCount}
          pct={pctOfPartners(noConversationCount)}
        />
        <StatCard
          label="Untagged"
          value={untaggedCount}
          pct={pctOfPartners(untaggedCount)}
        />
        <StatCard
          label="Warm"
          value={intentCounts.warm}
          pct={pctOfPartners(intentCounts.warm)}
          color={INTENT_COLORS.warm}
        />
        <StatCard
          label="Cold"
          value={intentCounts.cold}
          pct={pctOfPartners(intentCounts.cold)}
          color={INTENT_COLORS.cold}
        />
        <StatCard
          label="Neutral"
          value={intentCounts.neutral}
          pct={pctOfPartners(intentCounts.neutral)}
          color={INTENT_COLORS.neutral}
        />
      </div>

      {/* Conversations over time by intent */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-rise-black">Conversations Over Time</h3>
          <div className="flex gap-1.5">
            {CHART_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setChartRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  chartRange === opt.value
                    ? "bg-rise-green text-white"
                    : "bg-gray-100 text-rise-brown hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-rise-brown py-8 text-center">
            No dated conversations yet.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cold" stackId="a" fill={INTENT_COLORS.cold} name="Cold" />
                <Bar dataKey="neutral" stackId="a" fill={INTENT_COLORS.neutral} name="Neutral" />
                <Bar dataKey="warm" stackId="a" fill={INTENT_COLORS.warm} name="Warm" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Search + filter */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by counsellor or partner..."
        className="w-full px-4 py-2.5 mb-4 text-sm rounded-lg border border-gray-200 focus:border-rise-green focus:outline-none bg-white text-rise-black placeholder:text-rise-brown/50"
      />
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-rise-brown">
          {view === "partners"
            ? `${filteredJourneys.length} partner${filteredJourneys.length !== 1 ? "s" : ""}`
            : `${filteredConversations.length} conversation${filteredConversations.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-4">
          {Object.values(columnFilters).some((f) => f !== null) && (
            <button
              onClick={() =>
                setColumnFilters({ partner: null, intent: null, attendee: null, count: null, date: null })
              }
              className="text-xs text-rise-brown hover:text-rise-black underline"
            >
              Clear filters
            </button>
          )}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            <button
              onClick={() => setView("partners")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                view === "partners" ? "bg-white text-rise-black shadow-sm" : "text-rise-brown"
              }`}
            >
              Partners
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                view === "calendar" ? "bg-white text-rise-black shadow-sm" : "text-rise-brown"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {view === "partners" ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-medium text-rise-brown w-12">S.No</th>
                <th className="px-5 py-3 font-medium text-rise-brown">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:text-rise-black transition-colors"
                    >
                      Partner
                      <span className="text-[10px]">{sortIcon("name")}</span>
                    </button>
                    <ColumnFilterDropdown
                      options={partnerOptions}
                      value={columnFilters.partner}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, partner: v }))}
                      searchable
                    />
                  </div>
                </th>
                <th className="px-5 py-3 font-medium text-rise-brown">Journey</th>
                <th className="px-5 py-3 font-medium text-rise-brown">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSort("intent")}
                      className="flex items-center gap-1 hover:text-rise-black transition-colors"
                    >
                      Latest Intent
                      <span className="text-[10px]">{sortIcon("intent")}</span>
                    </button>
                    <ColumnFilterDropdown
                      options={intentOptions}
                      value={columnFilters.intent}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, intent: v }))}
                    />
                  </div>
                </th>
                <th className="px-5 py-3 font-medium text-rise-brown">
                  <div className="flex items-center gap-1.5">
                    Rep
                    <ColumnFilterDropdown
                      options={attendeeOptions}
                      value={columnFilters.attendee}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, attendee: v }))}
                      searchable
                    />
                  </div>
                </th>
                <th className="px-5 py-3 font-medium text-rise-brown">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSort("count")}
                      className="flex items-center gap-1 hover:text-rise-black transition-colors"
                    >
                      Conversations
                      <span className="text-[10px]">{sortIcon("count")}</span>
                    </button>
                    <ColumnFilterDropdown
                      options={countOptions}
                      value={columnFilters.count}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, count: v }))}
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-5 py-3 font-medium text-rise-brown">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 hover:text-rise-black transition-colors"
                    >
                      Last Conversation
                      <span className="text-[10px]">{sortIcon("date")}</span>
                    </button>
                    <ColumnFilterDropdown
                      options={dateOptions}
                      value={columnFilters.date}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, date: v }))}
                      align="right"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedJourneys.map((j, i) => (
                <tr
                  key={j.counselorRecordId}
                  onClick={() => setSelectedPartner(j)}
                  className="border-b border-gray-50 hover:bg-rise-cream/40 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3 text-rise-brown">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-rise-black">{j.companyName}</td>
                  <td className="px-5 py-3">
                    <JourneyDots conversations={j.conversations} />
                  </td>
                  <td className="px-5 py-3">
                    {j.latestIntent ? (
                      <span
                        className="px-2.5 py-1 text-xs font-medium rounded-md text-white"
                        style={{ backgroundColor: INTENT_COLORS[j.latestIntent] }}
                      >
                        {INTENT_LABELS[j.latestIntent]}
                      </span>
                    ) : (
                      <span className="text-rise-brown">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <RepChips conversations={j.conversations} />
                  </td>
                  <td className="px-5 py-3 text-rise-brown">{j.conversations.length}</td>
                  <td className="px-5 py-3 text-rise-brown">{formatDate(j.latestDate)}</td>
                </tr>
              ))}
              {sortedJourneys.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-rise-brown">
                    No partners match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <CalendarWidget
          conversations={filteredConversations}
          onSelectConversation={(c) => {
            const j = c.counselorRecordId ? journeysById.get(c.counselorRecordId) : undefined;
            if (j) setSelectedPartner(j);
          }}
        />
      )}

      {selectedPartner && (
        <PartnerDetailModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct?: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs font-medium text-rise-brown uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-rise-black">{value}</span>
        {pct !== undefined && (
          <span className="text-xs font-medium" style={{ color: color || "#9ca3af" }}>
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

function JourneyDots({ conversations }: { conversations: Conversation[] }) {
  const withIntent = conversations.filter((c) => c.intent);
  if (withIntent.length === 0) {
    return <span className="text-rise-brown text-xs">No intent logged</span>;
  }
  const shown = withIntent.slice(-10);
  const hiddenCount = withIntent.length - shown.length;
  return (
    <div className="flex items-center gap-1">
      {hiddenCount > 0 && (
        <span className="text-xs text-rise-brown mr-1">+{hiddenCount}</span>
      )}
      {shown.map((c, i) => (
        <span
          key={c.id}
          title={`${INTENT_LABELS[c.intent!]} · ${formatDate(c.date)}`}
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor: INTENT_COLORS[c.intent!],
            opacity: 0.5 + (0.5 * (i + 1)) / shown.length,
          }}
        />
      ))}
    </div>
  );
}

function RepChips({ conversations }: { conversations: Conversation[] }) {
  const reps = Array.from(new Set(conversations.map((c) => c.attendee).filter(Boolean)));
  if (reps.length === 0) {
    return <span className="text-rise-brown text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {reps.map((rep) => (
        <span
          key={rep}
          className="px-1.5 py-0.5 text-[11px] rounded-full bg-rise-cream text-rise-brown"
        >
          {rep}
        </span>
      ))}
    </div>
  );
}

import { fetchAllRecords, getField } from "./airtable";
import type { FunnelStage } from "./types";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";
const COUNSELOR_RECORDS_TABLE = "tblzcy02PoVxhAXId";
const BROCHURE_DOWNLOADS_TABLE = "tblRIS5zx51SYpkhB";

// --- Raw record types ---

export interface DiscoveryCallRecord {
  id: string;
  createdDate: string; // ISO
  consultationDate: string | null; // ISO
  applicationFormStatus: string | null; // "Form Sent" | "Don't Send" | "Drop" | null
  notes: string | null;
  lastModified: string; // ISO
}

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  createdDate: string; // ISO
}

export interface ApplicationRecord {
  id: string;
  name: string;
  email: string;
  followUpStatus: string | null;
  createdDate: string; // ISO
  interviewDate: string | null;
  lastModified: string; // ISO
  clientDate: string | null; // ISO, parsed from "Client Date" field (DD/MM/YYYY)
}

export interface BrochureDownloadRecord {
  id: string;
  date: string; // ISO
}

export interface CounselorRecord {
  counselorId: string;
  discoveryCallIds: string[];
  applicationIds: string[];
}

// --- Fetchers ---

export async function getAllDiscoveryCalls(): Promise<DiscoveryCallRecord[]> {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    fields: ["Created", "Consultation Date", "Student Application Form", "Last Modified", "Notes"],
  });

  return records.map((r) => ({
    id: r.id,
    createdDate: getField<string>(r, "Created") || r.createdTime,
    consultationDate: getField<string>(r, "Consultation Date") || null,
    applicationFormStatus: getField<string>(r, "Student Application Form") || null,
    notes: getField<string>(r, "Notes") || null,
    lastModified: getField<string>(r, "Last Modified") || r.createdTime,
  }));
}

export async function getAllLeads(): Promise<LeadRecord[]> {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    fields: ["Student Name", "Student Email ID", "Created"],
  });

  return records.map((r) => ({
    id: r.id,
    name: getField<string>(r, "Student Name") || "Unknown",
    email: (getField<string>(r, "Student Email ID") || "").toLowerCase(),
    createdDate: getField<string>(r, "Created") || r.createdTime,
  }));
}


export async function getAllBrochureDownloads(): Promise<BrochureDownloadRecord[]> {
  // Only record id/createdTime are used below (both metadata, unaffected by field
  // selection) — fetching no fields keeps the cached payload well under unstable_cache's
  // 2MB item limit, which an unfiltered fetch of this table was starting to exceed.
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, BROCHURE_DOWNLOADS_TABLE, {
    fields: ["Type"],
  });
  return records.map((r) => ({ id: r.id, date: r.createdTime }));
}

function parseClientDate(raw: string | null): string | null {
  if (!raw) return null;
  // Airtable returns ISO date string (YYYY-MM-DD)
  return new Date(raw).toISOString();
}

export async function getAllApplications(): Promise<ApplicationRecord[]> {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    fields: ["Name", "Student Email ID", "Follow Up Status", "Created", "Interview Date", "Last Modified", "Client Date"],
  });

  return records.map((r) => ({
    id: r.id,
    name: getField<string>(r, "Name") || "Unknown",
    email: (getField<string>(r, "Student Email ID") || "").toLowerCase(),
    followUpStatus: getField<string>(r, "Follow Up Status") || null,
    createdDate: getField<string>(r, "Created") || r.createdTime,
    interviewDate: getField<string>(r, "Interview Date") || null,
    lastModified: getField<string>(r, "Last Modified") || r.createdTime,
    clientDate: parseClientDate(getField<string>(r, "Client Date") || null),
  }));
}

export async function getAllCounselorRecords(): Promise<CounselorRecord[]> {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, COUNSELOR_RECORDS_TABLE, {
    fields: ["Counselor ID", "Research Scholar Application", "Parent Discovery Call"],
  });

  return records.map((r) => ({
    counselorId: getField<string>(r, "Counselor ID") || "",
    discoveryCallIds: getField<string[]>(r, "Parent Discovery Call") || [],
    applicationIds: getField<string[]>(r, "Research Scholar Application") || [],
  }));
}

// --- Stage classification (mirrors students.ts logic) ---

// "Interview" was a distinct FunnelStage; these statuses now classify as "Application".
const APPLICATION_STATUSES = new Set<string | null>([
  null, "", "SWA1", "SWA2", "SWA3", "Call Shortlisting",
  "Interview Completed", "AWA1", "AWA2", "AWA3", "Call Payment",
]);
const CLIENT_STATUSES = new Set<string | null>(["Client"]);

function getStageFromFollowUp(status: string | null): FunnelStage {
  if (!status || APPLICATION_STATUSES.has(status)) return "Application";
  if (CLIENT_STATUSES.has(status)) return "Client";
  return "Application";
}

// --- Time helpers ---

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

function toIST(dateStr: string): Date {
  const utc = new Date(dateStr).getTime();
  return new Date(utc + IST_OFFSET_MS);
}

function daysAgo(days: number): Date {
  // Midnight IST today, expressed as UTC
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  nowIST.setUTCHours(0, 0, 0, 0);
  nowIST.setUTCDate(nowIST.getUTCDate() - days);
  return new Date(nowIST.getTime() - IST_OFFSET_MS);
}

function periodToDays(period: string): number | null {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return null; // "all"
}

function isInPeriod(dateStr: string, periodStart: Date | null): boolean {
  if (!periodStart) return true;
  return new Date(dateStr) >= periodStart;
}

function daysBetween(d1: string, d2: string): number {
  const ms = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function toDateKey(dateStr: string): string {
  const ist = toIST(dateStr);
  return ist.toISOString().split("T")[0];
}

function toWeekKey(dateStr: string): string {
  const ist = toIST(dateStr);
  const day = ist.getUTCDay();
  const diff = ist.getUTCDate() - day + (day === 0 ? -6 : 1);
  ist.setUTCDate(diff);
  return ist.toISOString().split("T")[0];
}

// --- Compute analytics ---

export interface AnalyticsData {
  // Section 1: Pipeline snapshot
  stageCounts: Record<FunnelStage, number>;
  stageCountsPrevious: Record<FunnelStage, number>;

  // Section 2: Flow over time
  leadsOverTime: { date: string; leads: number; applications: number; brochureDownloads: number; clients: number }[];
  stageEntriesOverTime: { date: string; Lead: number; Application: number }[];

  // Section 3: Conversion & drop-off
  conversionFunnel: { stage: string; count: number; rate: number }[];
  dropOffs: { stage: string; count: number }[];

  // Section 4: Velocity
  velocity: { label: string; avgDays: number }[];

  // Section 5: Counselor insights
  topCounselors: { name: string; total: number; Lead: number; Application: number; Client: number }[];
  counselorActivity: { name: string; lastReferralDate: string; totalStudents: number; isActive: boolean }[];

  // Section 6: Discovery call analytics
  discoveryLeadsOverTime: { date: string; count: number }[];
  discoverySummary: { totalLeads: number; totalConsultations: number };
}

export function computeAnalytics(
  leads: LeadRecord[],
  applications: ApplicationRecord[],
  counselorRecords: CounselorRecord[],
  counselorNameMap: Map<string, string>,
  period: string,
  discoveryCalls: DiscoveryCallRecord[] = [],
  brochureDownloads: BrochureDownloadRecord[] = []
): AnalyticsData {
  const days = periodToDays(period);
  const periodStart = days ? daysAgo(days) : null;
  const prevPeriodStart = days ? daysAgo(days * 2) : null;

  // Deduplicate: applications take priority over discovery calls
  const applicationEmails = new Set(applications.map((a) => a.email).filter(Boolean));
  const uniqueLeads = leads.filter((l) => l.email && !applicationEmails.has(l.email));

  // --- STAGE COUNTS (current period) ---
  const stageCounts: Record<FunnelStage, number> = { Lead: 0, Application: 0, Client: 0 };
  const stageCountsPrevious: Record<FunnelStage, number> = { Lead: 0, Application: 0, Client: 0 };

  // Leads
  for (const lead of uniqueLeads) {
    if (isInPeriod(lead.createdDate, periodStart)) stageCounts.Lead++;
    if (prevPeriodStart && isInPeriod(lead.createdDate, prevPeriodStart) && !isInPeriod(lead.createdDate, periodStart)) {
      stageCountsPrevious.Lead++;
    }
  }

  // Applications (including all non-drop statuses)
  // For Client stage, use clientDate; for others, use lastModified
  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;
    const stage = getStageFromFollowUp(app.followUpStatus);
    if (stage === "Client") {
      if (!app.clientDate) continue;
      if (isInPeriod(app.clientDate, periodStart)) stageCounts.Client++;
      if (prevPeriodStart && isInPeriod(app.clientDate, prevPeriodStart) && !isInPeriod(app.clientDate, periodStart)) {
        stageCountsPrevious.Client++;
      }
    } else {
      if (isInPeriod(app.lastModified, periodStart)) stageCounts[stage]++;
      if (prevPeriodStart && isInPeriod(app.lastModified, prevPeriodStart) && !isInPeriod(app.lastModified, periodStart)) {
        stageCountsPrevious[stage]++;
      }
    }
  }

  // --- TIME SERIES: Leads vs Applications ---
  const useWeekly = days === null || days > 30;
  const keyFn = useWeekly ? toWeekKey : toDateKey;

  const leadsTimeMap = new Map<string, { leads: number; applications: number; brochureDownloads: number; clients: number }>();

  for (const lead of leads) {
    if (!isInPeriod(lead.createdDate, periodStart)) continue;
    const key = keyFn(lead.createdDate);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0, brochureDownloads: 0, clients: 0 };
    entry.leads++;
    leadsTimeMap.set(key, entry);
  }

  for (const app of applications) {
    if (!isInPeriod(app.createdDate, periodStart)) continue;
    const key = keyFn(app.createdDate);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0, brochureDownloads: 0, clients: 0 };
    entry.applications++;
    leadsTimeMap.set(key, entry);
  }

  for (const dl of brochureDownloads) {
    if (!isInPeriod(dl.date, periodStart)) continue;
    const key = keyFn(dl.date);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0, brochureDownloads: 0, clients: 0 };
    entry.brochureDownloads++;
    leadsTimeMap.set(key, entry);
  }

  for (const app of applications) {
    if (app.followUpStatus !== "Client" || !app.clientDate) continue;
    if (!isInPeriod(app.clientDate, periodStart)) continue;
    const key = keyFn(app.clientDate);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0, brochureDownloads: 0, clients: 0 };
    entry.clients++;
    leadsTimeMap.set(key, entry);
  }

  const leadsOverTime = Array.from(leadsTimeMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- TIME SERIES: Stage entries ---
  const stageTimeMap = new Map<string, { Lead: number; Application: number }>();

  for (const lead of uniqueLeads) {
    if (!isInPeriod(lead.createdDate, periodStart)) continue;
    const key = keyFn(lead.createdDate);
    const entry = stageTimeMap.get(key) || { Lead: 0, Application: 0 };
    entry.Lead++;
    stageTimeMap.set(key, entry);
  }

  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;
    const stage = getStageFromFollowUp(app.followUpStatus);
    if (stage === "Client") continue;
    const dateToUse = app.createdDate;
    if (!isInPeriod(dateToUse, periodStart)) continue;
    const key = keyFn(dateToUse);
    const entry = stageTimeMap.get(key) || { Lead: 0, Application: 0 };
    entry[stage]++;
    stageTimeMap.set(key, entry);
  }

  const stageEntriesOverTime = Array.from(stageTimeMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- CONVERSION FUNNEL ---
  const totalLeads = uniqueLeads.length + applications.length;
  const totalApplications = applications.filter((a) => a.followUpStatus !== "Drop").length;
  const totalClients = applications.filter(
    (a) => CLIENT_STATUSES.has(a.followUpStatus)
  ).length;

  const conversionFunnel = [
    { stage: "Lead", count: totalLeads, rate: 100 },
    { stage: "Application", count: totalApplications, rate: totalLeads > 0 ? Math.round((totalApplications / totalLeads) * 100) : 0 },
    { stage: "Client", count: totalClients, rate: totalApplications > 0 ? Math.round((totalClients / totalApplications) * 100) : 0 },
  ];

  // --- DROP-OFF ANALYSIS ---
  const dropByStage: Record<string, number> = {
    Lead: 0,
    Application: applications.filter((a) => a.followUpStatus === "Drop").length,
  };

  // Leads who never applied (not in applications table and older than 30 days)
  const thirtyDaysAgo = daysAgo(30);
  for (const lead of uniqueLeads) {
    if (new Date(lead.createdDate) < thirtyDaysAgo) {
      dropByStage["Lead"]++;
    }
  }

  const dropOffs = Object.entries(dropByStage)
    .map(([stage, count]) => ({ stage, count }))
    .filter((d) => d.count > 0);

  // --- VELOCITY ---
  const leadToAppDays: number[] = [];
  const appToClientDays: number[] = [];

  // Build email→lead created date map
  const leadDateMap = new Map<string, string>();
  for (const lead of leads) {
    if (lead.email) leadDateMap.set(lead.email, lead.createdDate);
  }

  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;

    // Lead → Application
    const leadDate = leadDateMap.get(app.email);
    if (leadDate) {
      const d = daysBetween(leadDate, app.createdDate);
      if (d >= 0 && d < 365) leadToAppDays.push(d);
    }

    // Application → Client
    if (CLIENT_STATUSES.has(app.followUpStatus)) {
      const d = daysBetween(app.createdDate, app.lastModified);
      if (d >= 0 && d < 365) appToClientDays.push(d);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  const velocity = [
    { label: "Lead → Application", avgDays: avg(leadToAppDays) },
    { label: "Application → Client", avgDays: avg(appToClientDays) },
  ];

  // --- COUNSELOR INSIGHTS ---
  // Build maps: applicationId → app, discoveryCallId → lead
  const appById = new Map(applications.map((a) => [a.id, a]));
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const counselorStatsMap = new Map<string, {
    total: number;
    Lead: number;
    Application: number;
    Client: number;
    latestDate: string;
  }>();

  for (const cr of counselorRecords) {
    if (!cr.counselorId) continue;
    const stats = counselorStatsMap.get(cr.counselorId) || {
      total: 0, Lead: 0, Application: 0, Client: 0, latestDate: "",
    };

    for (const appId of cr.applicationIds) {
      const app = appById.get(appId);
      if (!app || app.followUpStatus === "Drop") continue;
      const stage = getStageFromFollowUp(app.followUpStatus);
      stats[stage]++;
      stats.total++;
      if (app.createdDate > stats.latestDate) stats.latestDate = app.createdDate;
    }

    for (const leadId of cr.discoveryCallIds) {
      const lead = leadById.get(leadId);
      if (!lead) continue;
      // Only count as Lead if not already in applications
      if (!applicationEmails.has(lead.email)) {
        stats.Lead++;
        stats.total++;
        if (lead.createdDate > stats.latestDate) stats.latestDate = lead.createdDate;
      }
    }

    counselorStatsMap.set(cr.counselorId, stats);
  }

  const topCounselors = Array.from(counselorStatsMap.entries())
    .map(([counselorId, stats]) => ({
      name: counselorNameMap.get(counselorId) || counselorId,
      ...stats,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const sixtyDaysAgo = daysAgo(60);
  const counselorActivity = Array.from(counselorStatsMap.entries())
    .map(([counselorId, stats]) => ({
      name: counselorNameMap.get(counselorId) || counselorId,
      lastReferralDate: stats.latestDate,
      totalStudents: stats.total,
      isActive: stats.latestDate ? new Date(stats.latestDate) >= sixtyDaysAgo : false,
    }))
    .filter((c) => c.totalStudents > 0)
    .sort((a, b) => b.lastReferralDate.localeCompare(a.lastReferralDate));

  // --- DISCOVERY CALL ANALYTICS ---
  const discoveryLeadsMap = new Map<string, number>();
  let discoveryTotalLeads = 0;
  let discoveryTotalConsultations = 0;

  for (const dc of discoveryCalls) {
    // Leads created in period
    if (isInPeriod(dc.createdDate, periodStart)) {
      const key = keyFn(dc.createdDate);
      discoveryLeadsMap.set(key, (discoveryLeadsMap.get(key) || 0) + 1);
      discoveryTotalLeads++;
    }

    // Consultations that happened in period (by consultationDate)
    if (dc.consultationDate && isInPeriod(dc.consultationDate, periodStart)) {
      discoveryTotalConsultations++;
    }
  }

  const toSortedArray = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

  const discoveryLeadsOverTime = toSortedArray(discoveryLeadsMap);
  const discoverySummary = { totalLeads: discoveryTotalLeads, totalConsultations: discoveryTotalConsultations };

  return {
    stageCounts,
    stageCountsPrevious,
    leadsOverTime,
    stageEntriesOverTime,
    conversionFunnel,
    dropOffs,
    velocity,
    topCounselors,
    counselorActivity,
    discoveryLeadsOverTime,
    discoverySummary,
  };
}

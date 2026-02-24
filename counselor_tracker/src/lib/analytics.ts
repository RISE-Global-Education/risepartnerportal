import { fetchAllRecords, getField } from "./airtable";
import type { FunnelStage } from "./types";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";
const COUNSELOR_RECORDS_TABLE = "tblzcy02PoVxhAXId";

// --- Raw record types ---

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
}

export interface CounselorRecord {
  counselorId: string;
  discoveryCallIds: string[];
  applicationIds: string[];
}

// --- Fetchers ---

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

export async function getAllApplications(): Promise<ApplicationRecord[]> {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    fields: ["Name", "Student Email ID", "Follow Up Status", "Created", "Interview Date", "Last Modified"],
  });

  return records.map((r) => ({
    id: r.id,
    name: getField<string>(r, "Name") || "Unknown",
    email: (getField<string>(r, "Student Email ID") || "").toLowerCase(),
    followUpStatus: getField<string>(r, "Follow Up Status") || null,
    createdDate: getField<string>(r, "Created") || r.createdTime,
    interviewDate: getField<string>(r, "Interview Date") || null,
    lastModified: getField<string>(r, "Last Modified") || r.createdTime,
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

const APPLICATION_STATUSES = new Set<string | null>([null, "", "SWA1", "SWA2", "SWA3", "Call Shortlisting"]);
const INTERVIEW_STATUSES = new Set<string | null>(["Interview Completed", "AWA1", "AWA2", "AWA3", "Call Payment"]);
const CLIENT_STATUSES = new Set<string | null>(["Client"]);

function getStageFromFollowUp(status: string | null): FunnelStage {
  if (!status || APPLICATION_STATUSES.has(status)) return "Application";
  if (INTERVIEW_STATUSES.has(status)) return "Interview";
  if (CLIENT_STATUSES.has(status)) return "Client";
  return "Application";
}

// --- Time helpers ---

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
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
  return new Date(dateStr).toISOString().split("T")[0];
}

function toWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Get Monday of that week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// --- Compute analytics ---

export interface AnalyticsData {
  // Section 1: Pipeline snapshot
  stageCounts: Record<FunnelStage, number>;
  stageCountsPrevious: Record<FunnelStage, number>;
  subStageCounts: Record<string, number>;

  // Section 2: Flow over time
  leadsOverTime: { date: string; leads: number; applications: number }[];
  stageEntriesOverTime: { date: string; Lead: number; Application: number; Interview: number; Client: number }[];
  interviewsOverTime: { date: string; count: number }[];

  // Section 3: Conversion & drop-off
  conversionFunnel: { stage: string; count: number; rate: number }[];
  dropOffs: { stage: string; count: number }[];

  // Section 4: Velocity
  velocity: { label: string; avgDays: number }[];

  // Section 5: Counselor insights
  topCounselors: { name: string; total: number; Lead: number; Application: number; Interview: number; Client: number }[];
  counselorActivity: { name: string; lastReferralDate: string; totalStudents: number; isActive: boolean }[];
}

export function computeAnalytics(
  leads: LeadRecord[],
  applications: ApplicationRecord[],
  counselorRecords: CounselorRecord[],
  counselorNameMap: Map<string, string>,
  period: string
): AnalyticsData {
  const days = periodToDays(period);
  const periodStart = days ? daysAgo(days) : null;
  const prevPeriodStart = days ? daysAgo(days * 2) : null;

  // Deduplicate: applications take priority over discovery calls
  const applicationEmails = new Set(applications.map((a) => a.email).filter(Boolean));
  const uniqueLeads = leads.filter((l) => l.email && !applicationEmails.has(l.email));

  // Build unified student list for current period counts
  const now = new Date();

  // --- STAGE COUNTS (current period) ---
  const stageCounts: Record<FunnelStage, number> = { Lead: 0, Application: 0, Interview: 0, Client: 0 };
  const stageCountsPrevious: Record<FunnelStage, number> = { Lead: 0, Application: 0, Interview: 0, Client: 0 };

  // Leads
  for (const lead of uniqueLeads) {
    if (isInPeriod(lead.createdDate, periodStart)) stageCounts.Lead++;
    if (prevPeriodStart && isInPeriod(lead.createdDate, prevPeriodStart) && !isInPeriod(lead.createdDate, periodStart)) {
      stageCountsPrevious.Lead++;
    }
  }

  // Applications (including all non-drop statuses)
  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;
    const stage = getStageFromFollowUp(app.followUpStatus);
    if (isInPeriod(app.createdDate, periodStart)) stageCounts[stage]++;
    if (prevPeriodStart && isInPeriod(app.createdDate, prevPeriodStart) && !isInPeriod(app.createdDate, periodStart)) {
      stageCountsPrevious[stage]++;
    }
  }

  // --- SUB-STAGE BREAKDOWN ---
  const subStages = ["SWA1", "SWA2", "SWA3", "Call Shortlisting", "Interview Completed", "AWA1", "AWA2", "AWA3", "Call Payment"];
  const subStageCounts: Record<string, number> = {};
  for (const ss of subStages) subStageCounts[ss] = 0;

  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;
    const status = app.followUpStatus || "";
    if (subStages.includes(status)) {
      subStageCounts[status]++;
    } else if (!status || status === "") {
      // No status = early application stage, count as SWA1
      subStageCounts["SWA1"]++;
    }
  }

  // --- TIME SERIES: Leads vs Applications ---
  const useWeekly = days === null || days > 30;
  const keyFn = useWeekly ? toWeekKey : toDateKey;

  const leadsTimeMap = new Map<string, { leads: number; applications: number }>();

  for (const lead of leads) {
    if (!isInPeriod(lead.createdDate, periodStart)) continue;
    const key = keyFn(lead.createdDate);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0 };
    entry.leads++;
    leadsTimeMap.set(key, entry);
  }

  for (const app of applications) {
    if (!isInPeriod(app.createdDate, periodStart)) continue;
    const key = keyFn(app.createdDate);
    const entry = leadsTimeMap.get(key) || { leads: 0, applications: 0 };
    entry.applications++;
    leadsTimeMap.set(key, entry);
  }

  const leadsOverTime = Array.from(leadsTimeMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- TIME SERIES: Stage entries ---
  const stageTimeMap = new Map<string, { Lead: number; Application: number; Interview: number; Client: number }>();

  for (const lead of uniqueLeads) {
    if (!isInPeriod(lead.createdDate, periodStart)) continue;
    const key = keyFn(lead.createdDate);
    const entry = stageTimeMap.get(key) || { Lead: 0, Application: 0, Interview: 0, Client: 0 };
    entry.Lead++;
    stageTimeMap.set(key, entry);
  }

  for (const app of applications) {
    if (app.followUpStatus === "Drop") continue;
    if (!isInPeriod(app.createdDate, periodStart)) continue;
    const stage = getStageFromFollowUp(app.followUpStatus);
    const key = keyFn(app.createdDate);
    const entry = stageTimeMap.get(key) || { Lead: 0, Application: 0, Interview: 0, Client: 0 };
    entry[stage]++;
    stageTimeMap.set(key, entry);
  }

  const stageEntriesOverTime = Array.from(stageTimeMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- INTERVIEWS OVER TIME ---
  const interviewTimeMap = new Map<string, number>();
  for (const app of applications) {
    if (!app.interviewDate) continue;
    if (!isInPeriod(app.interviewDate, periodStart)) continue;
    const key = toWeekKey(app.interviewDate);
    interviewTimeMap.set(key, (interviewTimeMap.get(key) || 0) + 1);
  }

  const interviewsOverTime = Array.from(interviewTimeMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- CONVERSION FUNNEL ---
  const totalLeads = uniqueLeads.length + applications.length;
  const totalApplications = applications.filter((a) => a.followUpStatus !== "Drop").length;
  const totalInterviews = applications.filter(
    (a) => a.followUpStatus !== "Drop" && (INTERVIEW_STATUSES.has(a.followUpStatus) || CLIENT_STATUSES.has(a.followUpStatus))
  ).length;
  const totalClients = applications.filter(
    (a) => CLIENT_STATUSES.has(a.followUpStatus)
  ).length;

  const conversionFunnel = [
    { stage: "Lead", count: totalLeads, rate: 100 },
    { stage: "Application", count: totalApplications, rate: totalLeads > 0 ? Math.round((totalApplications / totalLeads) * 100) : 0 },
    { stage: "Interview", count: totalInterviews, rate: totalApplications > 0 ? Math.round((totalInterviews / totalApplications) * 100) : 0 },
    { stage: "Client", count: totalClients, rate: totalInterviews > 0 ? Math.round((totalClients / totalInterviews) * 100) : 0 },
  ];

  // --- DROP-OFF ANALYSIS ---
  const dropApplications = applications.filter((a) => a.followUpStatus === "Drop");
  const dropByStage: Record<string, number> = { Lead: 0, Application: 0, Interview: 0 };

  for (const app of dropApplications) {
    // Infer drop stage from the table they're in
    // Since they're all in Application table, they dropped at Application or later
    // We can look at whether they have interview date to determine
    if (app.interviewDate) {
      dropByStage["Interview"]++;
    } else {
      dropByStage["Application"]++;
    }
  }

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
  const appToInterviewDays: number[] = [];
  const interviewToClientDays: number[] = [];

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

    // Application → Interview
    if (app.interviewDate) {
      const d = daysBetween(app.createdDate, app.interviewDate);
      if (d >= 0 && d < 365) appToInterviewDays.push(d);
    }

    // Interview → Client
    if (app.interviewDate && CLIENT_STATUSES.has(app.followUpStatus)) {
      const d = daysBetween(app.interviewDate, app.lastModified);
      if (d >= 0 && d < 365) interviewToClientDays.push(d);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  const velocity = [
    { label: "Lead → Application", avgDays: avg(leadToAppDays) },
    { label: "Application → Interview", avgDays: avg(appToInterviewDays) },
    { label: "Interview → Client", avgDays: avg(interviewToClientDays) },
  ];

  // --- COUNSELOR INSIGHTS ---
  // Build maps: applicationId → app, discoveryCallId → lead
  const appById = new Map(applications.map((a) => [a.id, a]));
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const counselorStatsMap = new Map<string, {
    total: number;
    Lead: number;
    Application: number;
    Interview: number;
    Client: number;
    latestDate: string;
  }>();

  for (const cr of counselorRecords) {
    if (!cr.counselorId) continue;
    const stats = counselorStatsMap.get(cr.counselorId) || {
      total: 0, Lead: 0, Application: 0, Interview: 0, Client: 0, latestDate: "",
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

  return {
    stageCounts,
    stageCountsPrevious,
    subStageCounts,
    leadsOverTime,
    stageEntriesOverTime,
    interviewsOverTime,
    conversionFunnel,
    dropOffs,
    velocity,
    topCounselors,
    counselorActivity,
  };
}

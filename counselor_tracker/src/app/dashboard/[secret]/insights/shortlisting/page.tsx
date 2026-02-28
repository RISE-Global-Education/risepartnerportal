import { fetchAllRecords, getField } from "@/lib/airtable";
import ShortlistingInsightsClient from "./ShortlistingInsightsClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

const SHORTLISTING_STATUSES = ["SWA1", "SWA2", "SWA3", "Call Shortlisting"];

const SHORTLISTING_SEQUENCES = ["Shortlisting Mail"];

export interface MappedRow {
  applicantId: string;
  name: string;
  email: string;
  followUpStatus: string;
  shortlistingEmailSentTime: string | null;
  // Mixmax columns — null means no match in the shortlisting sequence
  sequenceName: string | null;
  sent: number | null;
  opened: number | null;
  replied: number | null;
}

const VALID_DAYS = [30, 60, 90] as const;
type DayRange = (typeof VALID_DAYS)[number];

export default async function ShortlistingInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days: DayRange = VALID_DAYS.includes(Number(daysParam) as DayRange)
    ? (Number(daysParam) as DayRange)
    : 30;

  // ── 1. Build date window ──
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  // ── 2. Fetch Airtable applicants in SWA/Call Shortlisting stages with email sent in window ──
  const statusFormula = `OR(${SHORTLISTING_STATUSES.map((s) => `{Follow Up Status}="${s}"`).join(",")})`;
  const dateFormula = `IS_AFTER({Shortlist Email Sent Time}, "${cutoff}")`;
  const formula = `AND(${statusFormula}, ${dateFormula})`;

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    fields: [
      "Applicant ID",
      "Name",
      "Student Email ID",
      "Follow Up Status",
      "Shortlist Email Sent Time",
    ],
    filterByFormula: formula,
  });

  const applicants = records.map((r) => ({
    applicantId: getField<string>(r, "Applicant ID") ?? "—",
    name: getField<string>(r, "Name") ?? "Unknown",
    email: (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim(),
    followUpStatus: getField<string>(r, "Follow Up Status") ?? "",
    shortlistingEmailSentTime: getField<string>(r, "Shortlist Email Sent Time") ?? null,
  }));

  // ── 3. Fetch Mixmax recipients from internal API ──
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  let allMixmaxRecipients: {
    email: string;
    sequenceName: string;
    sent: number;
    opened: number;
    replied: number;
  }[] = [];

  let mixmaxCachedAt: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/mixmax`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      mixmaxCachedAt = data.cachedAt ?? null;
      allMixmaxRecipients = (data.recipients ?? [])
        .filter((r: { sequenceName?: string }) =>
          SHORTLISTING_SEQUENCES.includes(r.sequenceName ?? "")
        )
        .map((r: {
          email: string;
          sequenceName?: string;
          sent: number;
          opened: number;
          replied: number;
        }) => ({
          email: r.email.toLowerCase().trim(),
          sequenceName: r.sequenceName ?? "Unknown",
          sent: r.sent,
          opened: r.opened,
          replied: r.replied,
        }));
    }
  } catch {
    // Mixmax unavailable — proceed with nulls
  }

  // ── 4. Build email → [MixmaxRow] map ──
  const mixmaxByEmail = new Map<string, typeof allMixmaxRecipients>();
  for (const r of allMixmaxRecipients) {
    const existing = mixmaxByEmail.get(r.email) ?? [];
    existing.push(r);
    mixmaxByEmail.set(r.email, existing);
  }

  // ── 5. Join: one row per (applicant × sequence) ──
  const rows: MappedRow[] = [];
  for (const a of applicants) {
    const matches = mixmaxByEmail.get(a.email);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        rows.push({
          applicantId: a.applicantId,
          name: a.name,
          email: a.email,
          followUpStatus: a.followUpStatus,
          shortlistingEmailSentTime: a.shortlistingEmailSentTime,
          sequenceName: m.sequenceName,
          sent: m.sent,
          opened: m.opened,
          replied: m.replied,
        });
      }
    } else {
      rows.push({
        applicantId: a.applicantId,
        name: a.name,
        email: a.email,
        followUpStatus: a.followUpStatus,
        shortlistingEmailSentTime: a.shortlistingEmailSentTime,
        sequenceName: null,
        sent: null,
        opened: null,
        replied: null,
      });
    }
  }

  return <ShortlistingInsightsClient rows={rows} days={days} mixmaxCachedAt={mixmaxCachedAt} fetchedAt={new Date().toISOString()} />;
}

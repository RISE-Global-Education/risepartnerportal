import { fetchAllRecords, getField } from "@/lib/airtable";
import { getMixmaxData } from "@/lib/mixmax";
import ParentsDiscoveryBookingClient from "./ParentsDiscoveryBookingClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const BOOKING_SEQUENCES = [
  "Parents  Discovery - Booking Link",
  "Parents Discovery - Booking Link (Updated)",
  "Parents Discovery - Booking Link Pakistan",
];

export interface MappedRow {
  recordId: string;
  studentName: string;
  parentEmail: string;
  qualifiedStatus: string;
  // Mixmax columns — null means no match in sequence
  sequenceName: string | null;
  sent: number | null;
  opened: number | null;
  replied: number | null;
}

const VALID_DAYS = [30, 60, 90] as const;
type DayRange = (typeof VALID_DAYS)[number];

export default async function ParentsDiscoveryBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days: DayRange = VALID_DAYS.includes(Number(daysParam) as DayRange)
    ? (Number(daysParam) as DayRange)
    : 30;

  // ── 1. Fetch Discovery Call rows where Qualified = "Email Sent" ──
  const formula = `{Qualified} = "Email Sent"`;

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    fields: [
      "Student Name",
      "Parent Email ID",
      "Qualified",
    ],
    filterByFormula: formula,
  });

  const applicants = records.map((r) => ({
    recordId: r.id,
    studentName: getField<string>(r, "Student Name") ?? "Unknown",
    parentEmail: (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim(),
    qualifiedStatus: getField<string>(r, "Qualified") ?? "",
  }));

  // ── 2. Fetch Mixmax recipients ──
  const { recipients: mixmaxAll, cachedAt: mixmaxCachedAt } = await getMixmaxData();
  const allMixmaxRecipients = mixmaxAll
    .filter((r) => BOOKING_SEQUENCES.includes(r.sequenceName ?? ""))
    .map((r) => ({
      email: r.email.toLowerCase().trim(),
      sequenceName: r.sequenceName ?? "Unknown",
      sent: r.sent,
      opened: r.opened,
      replied: r.replied,
    }));

  // ── 3. Build email → [MixmaxRow] map ──
  const mixmaxByEmail = new Map<string, typeof allMixmaxRecipients>();
  for (const r of allMixmaxRecipients) {
    const existing = mixmaxByEmail.get(r.email) ?? [];
    existing.push(r);
    mixmaxByEmail.set(r.email, existing);
  }

  // ── 4. Join: one row per (applicant × sequence) ──
  const rows: MappedRow[] = [];
  for (const a of applicants) {
    if (!a.parentEmail) {
      rows.push({
        recordId: a.recordId,
        studentName: a.studentName,
        parentEmail: a.parentEmail,
        qualifiedStatus: a.qualifiedStatus,
        sequenceName: null,
        sent: null,
        opened: null,
        replied: null,
      });
      continue;
    }
    const matches = mixmaxByEmail.get(a.parentEmail);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        rows.push({
          recordId: a.recordId,
          studentName: a.studentName,
          parentEmail: a.parentEmail,
          qualifiedStatus: a.qualifiedStatus,
          sequenceName: m.sequenceName,
          sent: m.sent,
          opened: m.opened,
          replied: m.replied,
        });
      }
    } else {
      rows.push({
        recordId: a.recordId,
        studentName: a.studentName,
        parentEmail: a.parentEmail,
        qualifiedStatus: a.qualifiedStatus,
        sequenceName: null,
        sent: null,
        opened: null,
        replied: null,
      });
    }
  }

  return <ParentsDiscoveryBookingClient rows={rows} days={days} mixmaxCachedAt={mixmaxCachedAt} fetchedAt={new Date().toISOString()} />;
}

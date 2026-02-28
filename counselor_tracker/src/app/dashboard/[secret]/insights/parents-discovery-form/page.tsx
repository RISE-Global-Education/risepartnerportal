import { fetchAllRecords, getField } from "@/lib/airtable";
import ParentsDiscoveryFormClient from "./ParentsDiscoveryFormClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const FORM_SEQUENCES = ["Parents  Discovery - Application Form"];

export interface MappedRow {
  recordId: string;
  studentName: string;
  parentEmail: string;
  applicationFormStatus: string;
  // Mixmax columns — null means no match in sequence
  sequenceName: string | null;
  sent: number | null;
  opened: number | null;
  replied: number | null;
}

const VALID_DAYS = [30, 60, 90] as const;
type DayRange = (typeof VALID_DAYS)[number];

export default async function ParentsDiscoveryFormPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days: DayRange = VALID_DAYS.includes(Number(daysParam) as DayRange)
    ? (Number(daysParam) as DayRange)
    : 30;

  // ── 1. Fetch Discovery Call rows where Student Application Form = "Form Sent" ──
  const formula = `{Student Application Form} = "Form Sent"`;

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    fields: [
      "Student Name",
      "Parent Email ID",
      "Student Application Form",
    ],
    filterByFormula: formula,
  });

  const applicants = records.map((r) => ({
    recordId: r.id,
    studentName: getField<string>(r, "Student Name") ?? "Unknown",
    parentEmail: (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim(),
    applicationFormStatus: getField<string>(r, "Student Application Form") ?? "",
  }));

  // ── 2. Fetch Mixmax recipients from internal API ──
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
          FORM_SEQUENCES.includes(r.sequenceName ?? "")
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
        applicationFormStatus: a.applicationFormStatus,
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
          applicationFormStatus: a.applicationFormStatus,
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
        applicationFormStatus: a.applicationFormStatus,
        sequenceName: null,
        sent: null,
        opened: null,
        replied: null,
      });
    }
  }

  return <ParentsDiscoveryFormClient rows={rows} days={days} mixmaxCachedAt={mixmaxCachedAt} fetchedAt={new Date().toISOString()} />;
}

import { fetchAllRecords, getField } from "@/lib/airtable";
import { readCache, MixmaxRecipient } from "@/app/api/mixmax/route";

// ── Constants ──────────────────────────────────────────────────────────────

export const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
export const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";
export const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

export const ACCEPTANCE_STATUSES = ["AWA1", "AWA2", "AWA3", "Call Payment"];
export const ACCEPTANCE_SEQUENCES = ["Acceptance Email - No Scholarship", "Acceptance Email - Scholarship"];

export const SHORTLISTING_STATUSES = ["SWA1", "SWA2", "SWA3", "Call Shortlisting"];
export const SHORTLISTING_SEQUENCES = ["Shortlisting Mail"];

export const BOOKING_SEQUENCES = ["Parents  Discovery - Booking Link", "Parents Discovery - Booking Link (Updated)"];
export const FORM_SEQUENCES = ["Parents  Discovery - Application Form"];

export const DAYS = 30;

// ── Types ──────────────────────────────────────────────────────────────────

export interface MixmaxRow {
  email: string;
  sequenceName: string;
  sent: number;
  opened: number;
  replied: number;
}

export interface PersonRow {
  name: string;
  email: string;
  status?: string;
}

export interface SectionResult {
  title: string;
  notSent: PersonRow[];
  sentNotOpened: PersonRow[];
  openedNotReplied: PersonRow[];
  replied: PersonRow[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type EmailBucket = "notSent" | "sentNotOpened" | "openedNotReplied" | "replied";

export function classifyEmail(email: string, mixmaxByEmail: Map<string, MixmaxRow[]>): EmailBucket {
  const matches = mixmaxByEmail.get(email);
  if (!matches || matches.length === 0 || matches.every((m) => m.sent === 0)) return "notSent";
  const totalReplied = matches.reduce((s, m) => s + m.replied, 0);
  if (totalReplied > 0) return "replied";
  const totalOpened = matches.reduce((s, m) => s + m.opened, 0);
  if (totalOpened > 0) return "openedNotReplied";
  return "sentNotOpened";
}

export function buildMixmaxMap(recipients: MixmaxRow[], sequences: string[]): Map<string, MixmaxRow[]> {
  const map = new Map<string, MixmaxRow[]>();
  for (const r of recipients) {
    if (!sequences.includes(r.sequenceName)) continue;
    const existing = map.get(r.email) ?? [];
    existing.push(r);
    map.set(r.email, existing);
  }
  return map;
}

export function classifyRecords(
  records: Awaited<ReturnType<typeof fetchAllRecords>>,
  emailField: string,
  nameField: string,
  mixmaxMap: Map<string, MixmaxRow[]>,
  statusField?: string,
): Omit<SectionResult, "title"> {
  const notSent: PersonRow[] = [];
  const sentNotOpened: PersonRow[] = [];
  const openedNotReplied: PersonRow[] = [];
  const replied: PersonRow[] = [];

  for (const r of records) {
    const email = (getField<string>(r, emailField) ?? "").toLowerCase().trim();
    if (!email) continue;
    const row: PersonRow = {
      name: getField<string>(r, nameField) ?? "Unknown",
      email,
      ...(statusField ? { status: getField<string>(r, statusField) ?? "" } : {}),
    };
    const bucket = classifyEmail(email, mixmaxMap);
    if (bucket === "notSent") notSent.push(row);
    else if (bucket === "sentNotOpened") sentNotOpened.push(row);
    else if (bucket === "openedNotReplied") openedNotReplied.push(row);
    else replied.push(row);
  }

  return { notSent, sentNotOpened, openedNotReplied, replied, total: records.length };
}

export async function loadMixmaxRows(allowLiveFetch = false): Promise<MixmaxRow[]> {
  const mapRecipients = (recipients: MixmaxRecipient[]) =>
    recipients.map((r) => ({
      email: r.email.toLowerCase().trim(),
      sequenceName: r.sequenceName ?? "",
      sent: r.sent,
      opened: r.opened,
      replied: r.replied,
    }));

  try {
    const cached = await readCache();
    if (cached) return mapRecipients(cached.data.recipients ?? []);
  } catch {
    // fall through
  }

  if (allowLiveFetch) {
    const apiKey = process.env.MIXMAX_API_KEY;
    if (apiKey && apiKey !== "your_key_here") {
      try {
        const { fetchFromMixmax, writeCache } = await import("@/app/api/mixmax/route");
        const data = await fetchFromMixmax(apiKey);
        await writeCache(data);
        return mapRecipients(data.recipients ?? []);
      } catch {
        // fall through
      }
    }
  }

  return [];
}

// ── Email HTML builder ─────────────────────────────────────────────────────

const BUCKETS: { key: keyof SectionResult; label: string; color: string; bg: string }[] = [
  { key: "notSent",          label: "Not Sent",             color: "#991b1b", bg: "#fee2e2" },
  { key: "sentNotOpened",    label: "Sent — Not Opened",    color: "#92400e", bg: "#fef3c7" },
  { key: "openedNotReplied", label: "Opened — Not Replied", color: "#1e40af", bg: "#dbeafe" },
  { key: "replied",          label: "Replied",              color: "#065f46", bg: "#d1fae5" },
];

function buildPersonTable(rows: PersonRow[], hasStatus: boolean): string {
  if (rows.length === 0) {
    return `<p style="margin:0;font-size:12px;color:#6b7280;font-style:italic;padding:8px 0;">None</p>`;
  }
  const tableRows = rows.map((r) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-size:12px;color:#111827;">${r.name}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${r.email}</td>
      ${hasStatus ? `<td style="padding:8px 12px;font-size:12px;color:#7c3aed;">${r.status ?? ""}</td>` : ""}
    </tr>`).join("");

  return `
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-top:6px;">
    <thead>
      <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
        <th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Name</th>
        <th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</th>
        ${hasStatus ? `<th style="padding:7px 12px;text-align:left;font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Stage</th>` : ""}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>`;
}

export function buildEmailHtml(sections: SectionResult[], generatedAt: string, isTest = false): string {
  const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);

  const sectionHtml = sections.map((sec) => {
    const hasStatus = [sec.notSent, sec.sentNotOpened, sec.openedNotReplied, sec.replied]
      .some((arr) => arr[0]?.status !== undefined);

    const summaryCards = BUCKETS.map((b) => {
      const rows = sec[b.key] as PersonRow[];
      return `
      <td style="width:25%;padding:0 6px;">
        <div style="background:${b.bg};border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:600;color:${b.color};text-transform:uppercase;letter-spacing:0.06em;">${b.label}</p>
          <p style="margin:0;font-size:26px;font-weight:700;color:${b.color};">${rows.length}</p>
        </div>
      </td>`;
    }).join("");

    const bucketsHtml = BUCKETS.map((b) => {
      const rows = sec[b.key] as PersonRow[];
      return `
      <div style="margin-bottom:16px;">
        <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="display:inline-block;background:${b.bg};color:${b.color};font-size:11px;font-weight:600;padding:2px 10px;border-radius:99px;">${b.label}</span>
          <span style="font-size:11px;color:#6b7280;">${rows.length} / ${sec.total}</span>
        </div>
        ${buildPersonTable(rows, hasStatus)}
      </div>`;
    }).join("");

    return `
    <div style="margin-bottom:36px;padding-bottom:36px;border-bottom:1px solid #e5e7eb;">
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">${sec.title} <span style="font-size:12px;font-weight:400;color:#6b7280;">· ${sec.total} applicants</span></h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><tr>${summaryCards}</tr></table>
      ${bucketsHtml}
    </div>`;
  }).join("");

  const testBanner = isTest ? `
    <div style="background:#fef3c7;padding:12px 32px;border-left:4px solid #f59e0b;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#92400e;">TEST RUN — triggered manually from dashboard</p>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#f3f4f6;">

    <div style="background:#111827;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">RISE Portal · Daily Check</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">${generatedAt} IST · Last 30 days</p>
    </div>

    ${testBanner}

    <div style="background:${totalNotSent > 0 ? "#fef3c7" : "#d1fae5"};padding:14px 32px;border-left:4px solid ${totalNotSent > 0 ? "#f59e0b" : "#10b981"};">
      <p style="margin:0;font-size:13px;font-weight:600;color:${totalNotSent > 0 ? "#92400e" : "#065f46"};">
        ${totalNotSent > 0 ? `⚠️  ${totalNotSent} people across all sections have not been emailed yet.` : "✅  All sections are clear — everyone has been emailed."}
      </p>
    </div>

    <div style="padding:24px 32px 8px;background:#fff;border-radius:0 0 12px 12px;">
      ${sectionHtml}
    </div>

  </div>
</body>
</html>`;
}

export async function buildSections(allowLiveFetch = false): Promise<SectionResult[]> {
  const allMixmax = await loadMixmaxRows(allowLiveFetch);
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sections: SectionResult[] = [];

  // Acceptance Email Audit
  {
    const statusFormula = `OR(${ACCEPTANCE_STATUSES.map((s) => `{Follow Up Status}="${s}"`).join(",")})`;
    const formula = `AND(${statusFormula}, IS_AFTER({Acceptances Email Sent Time}, "${cutoff}"))`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Follow Up Status"],
      filterByFormula: formula,
    });
    sections.push({ title: "Acceptance Email Audit", ...classifyRecords(records, "Student Email ID", "Name", buildMixmaxMap(allMixmax, ACCEPTANCE_SEQUENCES), "Follow Up Status") });
  }

  // Shortlisting
  {
    const statusFormula = `OR(${SHORTLISTING_STATUSES.map((s) => `{Follow Up Status}="${s}"`).join(",")})`;
    const formula = `AND(${statusFormula}, IS_AFTER({Shortlist Email Sent Time}, "${cutoff}"))`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Follow Up Status"],
      filterByFormula: formula,
    });
    sections.push({ title: "Shortlisting", ...classifyRecords(records, "Student Email ID", "Name", buildMixmaxMap(allMixmax, SHORTLISTING_SEQUENCES), "Follow Up Status") });
  }

  // Parents Discovery — Booking Link
  {
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Student Name", "Parent Email ID", "Qualified"],
      filterByFormula: `{Qualified} = "Email Sent"`,
    });
    sections.push({ title: "Parents Discovery — Booking Link", ...classifyRecords(records, "Parent Email ID", "Student Name", buildMixmaxMap(allMixmax, BOOKING_SEQUENCES)) });
  }

  // Parents Discovery — Application Form
  {
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Student Name", "Parent Email ID", "Student Application Form"],
      filterByFormula: `{Student Application Form} = "Form Sent"`,
    });
    sections.push({ title: "Parents Discovery — Application Form", ...classifyRecords(records, "Parent Email ID", "Student Name", buildMixmaxMap(allMixmax, FORM_SEQUENCES)) });
  }

  return sections;
}


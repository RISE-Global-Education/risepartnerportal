import { NextRequest, NextResponse } from "next/server";
import { fetchAllRecords, getField } from "@/lib/airtable";
import nodemailer from "nodemailer";

// ── Constants (mirrors the 4 insight pages) ────────────────────────────────

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const ACCEPTANCE_STATUSES = ["AWA1", "AWA2", "AWA3", "Call Payment"];
const ACCEPTANCE_SEQUENCES = ["Acceptance Email - No Scholarship", "Acceptance Email - Scholarship"];

const SHORTLISTING_STATUSES = ["SWA1", "SWA2", "SWA3", "Call Shortlisting"];
const SHORTLISTING_SEQUENCES = ["Shortlisting Mail"];

const BOOKING_SEQUENCES = ["Parents  Discovery - Booking Link"];
const FORM_SEQUENCES = ["Parents  Discovery - Application Form"];

const DAYS = 30; // same default as pages

// ── Types ──────────────────────────────────────────────────────────────────

interface MixmaxRow {
  email: string;
  sequenceName: string;
  sent: number;
}

interface NotSentRow {
  name: string;
  email: string;
  status?: string;
}

interface SectionResult {
  title: string;
  notSent: NotSentRow[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isNotSent(email: string, mixmaxByEmail: Map<string, MixmaxRow[]>): boolean {
  const matches = mixmaxByEmail.get(email);
  if (!matches || matches.length === 0) return true;
  return matches.every((m) => m.sent === 0);
}

function buildMixmaxMap(recipients: MixmaxRow[], sequences: string[]): Map<string, MixmaxRow[]> {
  const map = new Map<string, MixmaxRow[]>();
  for (const r of recipients) {
    if (!sequences.includes(r.sequenceName)) continue;
    const existing = map.get(r.email) ?? [];
    existing.push(r);
    map.set(r.email, existing);
  }
  return map;
}

// ── Gmail transporter ──────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Email HTML builder ─────────────────────────────────────────────────────

function buildEmailHtml(sections: SectionResult[], generatedAt: string): string {
  const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);

  const sectionHtml = sections
    .map((sec) => {
      const rows =
        sec.notSent.length === 0
          ? `<tr><td colspan="3" style="padding:12px 16px;color:#6b7280;font-style:italic;">All caught up — no pending recipients.</td></tr>`
          : sec.notSent
              .map(
                (r) => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 16px;font-size:13px;color:#111827;">${r.name}</td>
            <td style="padding:10px 16px;font-size:12px;color:#6b7280;">${r.email}</td>
            ${r.status ? `<td style="padding:10px 16px;font-size:12px;color:#7c3aed;">${r.status}</td>` : ""}
          </tr>`
              )
              .join("");

      return `
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h2 style="margin:0;font-size:14px;font-weight:700;color:#111827;">${sec.title}</h2>
          <span style="font-size:12px;color:#6b7280;">${sec.notSent.length} not sent / ${sec.total} total</span>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Name</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</th>
              ${sec.notSent[0]?.status !== undefined ? `<th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Stage</th>` : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#f3f4f6;">

    <!-- Header -->
    <div style="background:#111827;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">RISE Portal · Daily Check</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">${generatedAt} IST</p>
    </div>

    <!-- Summary banner -->
    <div style="background:${totalNotSent > 0 ? "#fef3c7" : "#d1fae5"};padding:16px 32px;border-left:4px solid ${totalNotSent > 0 ? "#f59e0b" : "#10b981"};">
      <p style="margin:0;font-size:14px;font-weight:600;color:${totalNotSent > 0 ? "#92400e" : "#065f46"};">
        ${totalNotSent > 0 ? `⚠️  ${totalNotSent} people across all sections have not been emailed yet.` : "✅  All sections are clear — everyone has been emailed."}
      </p>
    </div>

    <!-- Sections -->
    <div style="padding:24px 32px 32px;background:#fff;border-radius:0 0 12px 12px;">
      ${sectionHtml}
    </div>

  </div>
</body>
</html>`;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.MIXMAX_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // ── 1. Fetch Mixmax recipients (all sequences) ─────────────────────────
  let allMixmax: MixmaxRow[] = [];
  if (apiKey && apiKey !== "your_key_here") {
    try {
      const res = await fetch(`${baseUrl}/api/mixmax`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        allMixmax = (data.recipients ?? []).map((r: { email: string; sequenceName?: string; sent: number }) => ({
          email: r.email.toLowerCase().trim(),
          sequenceName: r.sequenceName ?? "",
          sent: r.sent,
        }));
      }
    } catch {
      console.warn("[DailyCheck] Could not fetch Mixmax data");
    }
  }

  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sections: SectionResult[] = [];

  // ── 2. Acceptance Email Audit ──────────────────────────────────────────
  {
    const statusFormula = `OR(${ACCEPTANCE_STATUSES.map((s) => `{Follow Up Status}="${s}"`).join(",")})`;
    const formula = `AND(${statusFormula}, IS_AFTER({Acceptances Email Sent Time}, "${cutoff}"))`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Follow Up Status"],
      filterByFormula: formula,
    });

    const mixmaxMap = buildMixmaxMap(allMixmax, ACCEPTANCE_SEQUENCES);
    const notSent: NotSentRow[] = [];
    for (const r of records) {
      const email = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
      if (isNotSent(email, mixmaxMap)) {
        notSent.push({
          name: getField<string>(r, "Name") ?? "Unknown",
          email,
          status: getField<string>(r, "Follow Up Status") ?? "",
        });
      }
    }
    sections.push({ title: "Acceptance Email Audit", notSent, total: records.length });
  }

  // ── 3. Shortlisting ────────────────────────────────────────────────────
  {
    const statusFormula = `OR(${SHORTLISTING_STATUSES.map((s) => `{Follow Up Status}="${s}"`).join(",")})`;
    const formula = `AND(${statusFormula}, IS_AFTER({Shortlist Email Sent Time}, "${cutoff}"))`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Follow Up Status"],
      filterByFormula: formula,
    });

    const mixmaxMap = buildMixmaxMap(allMixmax, SHORTLISTING_SEQUENCES);
    const notSent: NotSentRow[] = [];
    for (const r of records) {
      const email = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
      if (isNotSent(email, mixmaxMap)) {
        notSent.push({
          name: getField<string>(r, "Name") ?? "Unknown",
          email,
          status: getField<string>(r, "Follow Up Status") ?? "",
        });
      }
    }
    sections.push({ title: "Shortlisting", notSent, total: records.length });
  }

  // ── 4. Parents Discovery — Booking Link ───────────────────────────────
  {
    const formula = `{Qualified} = "Email Sent"`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Student Name", "Parent Email ID", "Qualified"],
      filterByFormula: formula,
    });

    const mixmaxMap = buildMixmaxMap(allMixmax, BOOKING_SEQUENCES);
    const notSent: NotSentRow[] = [];
    for (const r of records) {
      const email = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
      if (!email) continue;
      if (isNotSent(email, mixmaxMap)) {
        notSent.push({ name: getField<string>(r, "Student Name") ?? "Unknown", email });
      }
    }
    sections.push({ title: "Parents Discovery — Booking Link", notSent, total: records.length });
  }

  // ── 5. Parents Discovery — Application Form ───────────────────────────
  {
    const formula = `{Student Application Form} = "Form Sent"`;
    const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      fields: ["Student Name", "Parent Email ID", "Student Application Form"],
      filterByFormula: formula,
    });

    const mixmaxMap = buildMixmaxMap(allMixmax, FORM_SEQUENCES);
    const notSent: NotSentRow[] = [];
    for (const r of records) {
      const email = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
      if (!email) continue;
      if (isNotSent(email, mixmaxMap)) {
        notSent.push({ name: getField<string>(r, "Student Name") ?? "Unknown", email });
      }
    }
    sections.push({ title: "Parents Discovery — Application Form", notSent, total: records.length });
  }

  // ── 6. Send email ──────────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
  const subject = totalNotSent > 0
    ? `⚠️ RISE Daily Check — ${totalNotSent} not emailed (${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" })})`
    : `✅ RISE Daily Check — All clear (${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" })})`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"RISE Portal" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject,
      html: buildEmailHtml(sections, generatedAt),
    });
    console.log("[DailyCheck] Email sent to", process.env.NOTIFY_EMAIL);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DailyCheck] Failed to send email:", message);
    return NextResponse.json({ error: `Email failed: ${message}`, sections }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sentAt: new Date().toISOString(),
    totalNotSent,
    sections: sections.map((s) => ({ title: s.title, notSent: s.notSent.length, total: s.total })),
  });
}

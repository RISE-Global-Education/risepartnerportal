import { NextRequest, NextResponse } from "next/server";
import { fetchFromMixmax, writeCache, readCache } from "@/app/api/mixmax/route";
import { fetchAllRecords, getField } from "@/lib/airtable";
import nodemailer from "nodemailer";

// Mirrors the constants in the cron daily-check
const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const ACCEPTANCE_STATUSES = ["AWA1", "AWA2", "AWA3", "Call Payment"];
const ACCEPTANCE_SEQUENCES = ["Acceptance Email - No Scholarship", "Acceptance Email - Scholarship"];
const SHORTLISTING_STATUSES = ["SWA1", "SWA2", "SWA3", "Call Shortlisting"];
const SHORTLISTING_SEQUENCES = ["Shortlisting Mail"];
const BOOKING_SEQUENCES = ["Parents  Discovery - Booking Link"];
const FORM_SEQUENCES = ["Parents  Discovery - Application Form"];
const DAYS = 30;

interface MixmaxRow { email: string; sequenceName: string; sent: number }
interface NotSentRow { name: string; email: string; status?: string }
interface SectionResult { title: string; notSent: NotSentRow[]; total: number }

function isNotSent(email: string, map: Map<string, MixmaxRow[]>): boolean {
  const matches = map.get(email);
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

export async function POST(req: NextRequest) {
  // Gate with DASHBOARD_SECRET so only logged-in dashboard users can call this
  const auth = req.headers.get("x-dashboard-secret");
  if (!auth || auth !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: {
    name: string;
    ok: boolean;
    detail: string;
  }[] = [];

  // ── Step 1: Refresh Mixmax cache ──────────────────────────────────────────
  const apiKey = process.env.MIXMAX_API_KEY;
  let allMixmax: MixmaxRow[] = [];

  if (!apiKey || apiKey === "your_key_here") {
    steps.push({ name: "Mixmax refresh", ok: false, detail: "MIXMAX_API_KEY not configured" });
  } else {
    try {
      const data = await fetchFromMixmax(apiKey);
      await writeCache(data);
      allMixmax = (data.recipients ?? []).map((r) => ({
        email: r.email.toLowerCase().trim(),
        sequenceName: r.sequenceName ?? "",
        sent: r.sent,
      }));
      steps.push({
        name: "Mixmax refresh",
        ok: true,
        detail: `Fetched ${data.recipients.length} recipients across all sequences`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Try to use existing cache
      try {
        const cached = await readCache();
        if (cached) {
          allMixmax = (cached.data.recipients ?? []).map((r) => ({
            email: r.email.toLowerCase().trim(),
            sequenceName: r.sequenceName ?? "",
            sent: r.sent,
          }));
          steps.push({
            name: "Mixmax refresh",
            ok: false,
            detail: `Fetch failed (${message}) — using stale cache from ${cached.fetchedAt}`,
          });
        } else {
          steps.push({ name: "Mixmax refresh", ok: false, detail: message });
        }
      } catch {
        steps.push({ name: "Mixmax refresh", ok: false, detail: message });
      }
    }
  }

  // ── Step 2: Airtable checks ───────────────────────────────────────────────
  const sections: SectionResult[] = [];
  let airtableOk = true;
  let airtableDetail = "";

  try {
    const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Acceptance
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
          notSent.push({ name: getField<string>(r, "Name") ?? "Unknown", email, status: getField<string>(r, "Follow Up Status") ?? "" });
        }
      }
      sections.push({ title: "Acceptance Email Audit", notSent, total: records.length });
    }

    // Shortlisting
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
          notSent.push({ name: getField<string>(r, "Name") ?? "Unknown", email, status: getField<string>(r, "Follow Up Status") ?? "" });
        }
      }
      sections.push({ title: "Shortlisting", notSent, total: records.length });
    }

    // Booking
    {
      const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
        fields: ["Student Name", "Parent Email ID", "Qualified"],
        filterByFormula: `{Qualified} = "Email Sent"`,
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

    // Form
    {
      const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
        fields: ["Student Name", "Parent Email ID", "Student Application Form"],
        filterByFormula: `{Student Application Form} = "Form Sent"`,
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

    const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
    airtableDetail = sections
      .map((s) => `${s.title}: ${s.notSent.length}/${s.total} not sent`)
      .join(" · ");
    steps.push({
      name: "Airtable check",
      ok: true,
      detail: `${totalNotSent} total not sent — ${airtableDetail}`,
    });
  } catch (err) {
    airtableOk = false;
    airtableDetail = err instanceof Error ? err.message : String(err);
    steps.push({ name: "Airtable check", ok: false, detail: airtableDetail });
  }

  // ── Step 3: Send email ────────────────────────────────────────────────────
  if (airtableOk && sections.length > 0) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });

      const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
      const generatedAt = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });

      const subject = `[TEST] ${totalNotSent > 0 ? `⚠️ RISE Daily Check — ${totalNotSent} not emailed` : "✅ RISE Daily Check — All clear"} (${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" })})`;

      const sectionHtml = sections.map((sec) => {
        const rows = sec.notSent.length === 0
          ? `<tr><td colspan="3" style="padding:12px 16px;color:#6b7280;font-style:italic;">All caught up.</td></tr>`
          : sec.notSent.map((r) => `<tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:10px 16px;font-size:13px;">${r.name}</td>
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;">${r.email}</td>
              ${r.status ? `<td style="padding:10px 16px;font-size:12px;color:#7c3aed;">${r.status}</td>` : ""}
            </tr>`).join("");
        return `<div style="margin-bottom:24px;">
          <h2 style="margin:0 0 8px;font-size:14px;font-weight:700;">${sec.title} — ${sec.notSent.length}/${sec.total} not sent</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }).join("");

      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
          <p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px;font-weight:600;color:#92400e;">
            TEST RUN — triggered manually from dashboard at ${generatedAt} IST
          </p>
          ${sectionHtml}
        </div>
      </body></html>`;

      await transporter.sendMail({
        from: `"RISE Portal" <${process.env.GMAIL_USER}>`,
        to: process.env.NOTIFY_EMAIL,
        subject,
        html,
      });

      steps.push({
        name: "Email sent",
        ok: true,
        detail: `Test email delivered to ${process.env.NOTIFY_EMAIL}`,
      });
    } catch (err) {
      steps.push({
        name: "Email sent",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    steps.push({
      name: "Email sent",
      ok: false,
      detail: "Skipped — Airtable check did not complete successfully",
    });
  }

  const allOk = steps.every((s) => s.ok);
  return NextResponse.json({ ok: allOk, steps });
}

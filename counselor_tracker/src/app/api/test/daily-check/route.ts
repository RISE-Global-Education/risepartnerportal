import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildSections, buildEmailHtml } from "@/lib/daily-check";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-dashboard-secret");
  if (!auth || auth !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: { name: string; ok: boolean; detail: string }[] = [];

  let sections: Awaited<ReturnType<typeof buildSections>>;
  try {
    sections = await buildSections(true);
    const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
    steps.push({
      name: "Data fetch",
      ok: true,
      detail: sections.map((s) => `${s.title}: ${s.notSent.length}/${s.total} not sent`).join(" · ") +
        ` — ${totalNotSent} total not sent`,
    });
  } catch (err) {
    steps.push({ name: "Data fetch", ok: false, detail: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, steps });
  }

  try {
    const generatedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
    const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" });
    const subject = `[TEST] ${totalNotSent > 0 ? `⚠️ RISE Daily Check — ${totalNotSent} not emailed` : "✅ RISE Daily Check — All clear"} (${dateStr})`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"RISE Portal" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject,
      html: buildEmailHtml(sections, generatedAt, true),
    });

    steps.push({ name: "Email sent", ok: true, detail: `Test email delivered to ${process.env.NOTIFY_EMAIL}` });
  } catch (err) {
    steps.push({ name: "Email sent", ok: false, detail: err instanceof Error ? err.message : String(err) });
  }

  return NextResponse.json({ ok: steps.every((s) => s.ok), steps });
}

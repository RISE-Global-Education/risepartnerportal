import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildSections, buildEmailHtml } from "@/lib/daily-check";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await buildSections();

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const totalNotSent = sections.reduce((s, sec) => s + sec.notSent.length, 0);
  const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" });
  const subject = totalNotSent > 0
    ? `⚠️ RISE Daily Check — ${totalNotSent} not emailed (${dateStr})`
    : `✅ RISE Daily Check — All clear (${dateStr})`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
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
    return NextResponse.json({ error: `Email failed: ${message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sentAt: new Date().toISOString(),
    totalNotSent,
    sections: sections.map((s) => ({
      title: s.title,
      notSent: s.notSent.length,
      sentNotOpened: s.sentNotOpened.length,
      openedNotReplied: s.openedNotReplied.length,
      replied: s.replied.length,
      total: s.total,
    })),
  });
}

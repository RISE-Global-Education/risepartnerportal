import { NextRequest, NextResponse } from "next/server";
import { mutate } from "@/lib/lms-db";
import { EMAIL_UNSUBSCRIBES as U } from "@/lib/supabase-schema";
import { RISE_POC_OPTIONS } from "@/lib/rise-pocs";

// The no-send list is record-keeping only. Reads here are deliberately
// uncached (mutate(), not query()) so a freshly added row shows up at once.

const PAGE_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Row {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  country: string | null;
  risePoc: string[];
  createdAt: string;
}

const SELECT = `${U.id}::text AS id, ${U.email} AS email, ${U.name} AS name,
  ${U.companyName} AS "companyName", ${U.country} AS country,
  ${U.risePoc} AS "risePoc", ${U.createdAt} AS "createdAt"`;

function unauthorized(secret: unknown) {
  return secret !== process.env.DASHBOARD_SECRET;
}

// Spreadsheet apps execute cells starting with these as formulas.
function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  if (unauthorized(sp.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = (sp.get("q") || "").trim();
  const where = search
    ? `WHERE ${U.email} ILIKE $1 OR ${U.name} ILIKE $1 OR ${U.companyName} ILIKE $1 OR ${U.country} ILIKE $1`
    : "";
  const params: unknown[] = search ? [`%${search.replace(/[%_\\]/g, "\\$&")}%`] : [];

  if (sp.get("format") === "csv") {
    const rows = await mutate<Row>(
      `SELECT ${SELECT} FROM ${U.table} ${where} ORDER BY ${U.createdAt} DESC`,
      params
    );
    const header = ["Name", "Company Name", "Country", "Email", "Primary POC", "Added"];
    const lines = [header.map(csvCell).join(",")].concat(
      rows.map((r) =>
        [r.name, r.companyName, r.country, r.email, (r.risePoc || []).join("; "), r.createdAt]
          .map(csvCell)
          .join(",")
      )
    );
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="no-send-list-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const [{ count }] = await mutate<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${U.table} ${where}`,
    params
  );
  const rows = await mutate<Row>(
    `SELECT ${SELECT} FROM ${U.table} ${where}
     ORDER BY ${U.createdAt} DESC, ${U.id} DESC
     LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params
  );
  return NextResponse.json({ rows, total: Number(count), page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (unauthorized(body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const risePoc = Array.isArray(body.risePoc)
    ? body.risePoc.filter((p: unknown) => typeof p === "string" && RISE_POC_OPTIONS.includes(p))
    : [];

  const inserted = await mutate<{ id: string }>(
    `INSERT INTO ${U.table} (${U.email}, ${U.name}, ${U.companyName}, ${U.country}, ${U.risePoc})
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (lower(${U.email})) DO NOTHING
     RETURNING ${U.id}::text AS id`,
    [email, opt(body.name), opt(body.companyName), opt(body.country), risePoc]
  );

  if (inserted.length === 0) {
    return NextResponse.json({ error: "This email is already on the list" }, { status: 409 });
  }
  return NextResponse.json({ success: true, id: inserted[0].id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  if (unauthorized(body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.id || !/^\d+$/.test(String(body.id))) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await mutate(`DELETE FROM ${U.table} WHERE ${U.id} = $1`, [body.id]);
  return NextResponse.json({ success: true });
}

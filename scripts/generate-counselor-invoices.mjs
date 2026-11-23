#!/usr/bin/env node
// Manual version of the monthly job: writes a .sql file that creates one Pending
// counselor_invoices row for every counselor with referred students in a billing
// period. A period runs from the 26th of one month to the 26th of the next, named
// after the month it ends in ("November 2026" is October 26 to November 26).
// Use it to backfill a month or to preview what the automatic job will create.
//
// It only READS Airtable (the same student table the Invoices tab uses). It never
// connects to the database: you review the generated file and apply it yourself
// in the Supabase SQL editor.
//
// Usage:
//   node scripts/generate-counselor-invoices.mjs --month "October 2026" [--out file.sql]
//
//   --month  required. The bill's name: a full month name and year, such as "November 2026".
//   --out    optional. Defaults to counselor-invoices-<month>.sql in the current folder.
//
// Bill IDs are the counselor ID and the month, for example PR1126_November2026,
// so the SQL is safe to re-run: a bill that already exists is skipped.
//
// Needs AIRTABLE_TOKEN, AIRTABLE_REFERRAL_BASE_ID and AIRTABLE_REFERRAL_TABLE_ID in
// .env.local (or the environment).

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Mirrors billLabelForInstant() in src/lib/bill-id.ts: keep the two in step. IST,
// start inclusive, end exclusive, so the 26th at midnight begins
// the next period.
function billLabelForInstant(instant) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const year = get("year");
  const month = get("month") + (get("day") >= 26 ? 1 : 0);
  const index = (((month - 1) % 12) + 12) % 12;
  return `${MONTHS[index]} ${year + Math.floor((month - 1) / 12)}`;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const monthArg = arg("month");
const parsed = monthArg ? /^([A-Za-z]+)\s+(\d{4})$/.exec(monthArg.trim()) : null;
const monthIndex = parsed ? MONTHS.findIndex((m) => m.toLowerCase() === parsed[1].toLowerCase()) : -1;
if (monthIndex === -1) {
  fail('Missing or invalid --month. Use a full month name and year, for example --month "October 2026".');
}
const month = `${MONTHS[monthIndex]} ${parsed[2]}`;

loadEnvLocal();
const token = process.env.AIRTABLE_TOKEN;
if (!token) fail("AIRTABLE_TOKEN is not set (.env.local or the environment).");
const BASE = process.env.AIRTABLE_REFERRAL_BASE_ID?.trim();
const TABLE = process.env.AIRTABLE_REFERRAL_TABLE_ID?.trim();
if (!BASE || !TABLE) {
  fail("Set AIRTABLE_REFERRAL_BASE_ID and AIRTABLE_REFERRAL_TABLE_ID (.env.local or the environment).");
}

// Only the two fields needed, so no student details are ever downloaded.
const fields = ["Record Created", "Counselor Name", "Referral %"];
const counselors = new Map(); // counselor id -> student count
const hasRate = new Set(); // counselors with a referral rate above 0 in the period

// "10.0%" or ["10.0%"] becomes 10. Missing, unreadable or 0 is no rate.
function rateOf(value) {
  const raw = [].concat(value ?? [])[0];
  const n = typeof raw === "number" ? (raw > 0 && raw <= 1 ? raw * 100 : raw) : parseFloat(String(raw ?? "").replace("%", ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
let offset;
do {
  const params = new URLSearchParams({ pageSize: "100" });
  for (const f of fields) params.append("fields[]", f);
  if (offset) params.set("offset", offset);
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) fail(`Airtable error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  for (const record of data.records) {
    const created = new Date(record.fields["Record Created"]);
    if (Number.isNaN(created.getTime()) || billLabelForInstant(created) !== month) continue;
    const name = [].concat(record.fields["Counselor Name"] ?? [])[0];
    const id = typeof name === "string" ? /(PR\d+)\s*$/i.exec(name.trim())?.[1]?.toUpperCase() : null;
    if (!id) continue;
    counselors.set(id, (counselors.get(id) ?? 0) + 1);
    if (rateOf(record.fields["Referral %"]) != null) hasRate.add(id);
  }
  offset = data.offset;
} while (offset);

if (counselors.size === 0) {
  fail(`No students found for the "${month}" period in the Airtable view. Check the month spelling.`);
}

// Only counselors with a referral rate get a bill; the rest have nothing to invoice.
const ids = [...counselors.keys()].filter((id) => hasRate.has(id)).sort();
if (ids.length === 0) fail(`No counselors with a referral rate had students in the "${month}" period.`);
const compactMonth = `${MONTHS[monthIndex]}${parsed[2]}`;
const values = ids.map((id) => `    ('${id}_${compactMonth}', '${id}', '${month}')`).join(",\n");
const students = ids.reduce((n, id) => n + counselors.get(id), 0);

const sql = `-- Generated by scripts/generate-counselor-invoices.mjs
-- Month: ${month}. ${ids.length} counselors, ${students} students.
-- Review, then run in the Supabase SQL editor. Safe to re-run.

INSERT INTO counselor_invoices (bill_id, counselor_id, billing_month, payment_status)
SELECT v.bill_id, v.counselor_id, v.billing_month, 'Pending'
FROM (VALUES
${values}
) AS v(bill_id, counselor_id, billing_month)
ON CONFLICT DO NOTHING;
`;

const out = arg("out") ?? `counselor-invoices-${month.toLowerCase().replace(/\s+/g, "-")}.sql`;
writeFileSync(out, sql, "utf8");
console.log(`Wrote ${out}: ${ids.length} counselors, ${students} students for ${month}.`);

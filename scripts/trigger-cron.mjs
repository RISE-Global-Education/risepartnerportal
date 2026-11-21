#!/usr/bin/env node
// Calls one of the portal's cron routes with the secret from .env.local, so you
// never have to type the secret or fight shell quoting. For local testing.
//
// Usage:
//   node scripts/trigger-cron.mjs generate "October 2026"   bill a month
//   node scripts/trigger-cron.mjs reconcile                 match Drive files to bills
//
// Optional: --url https://your-portal-domain  (defaults to http://localhost:3000)
//
// Note: these routes write to whatever database .env.local points at.

import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const baseUrl = (urlIndex !== -1 ? args[urlIndex + 1] : "http://localhost:3000").replace(/\/$/, "");
const positional = args.filter((_, i) => urlIndex === -1 || (i !== urlIndex && i !== urlIndex + 1));
const [action, month] = positional;

const routes = {
  generate: "/api/cron/generate-counselor-invoices",
  reconcile: "/api/cron/reconcile-counselor-invoices",
};
if (!routes[action]) {
  console.error('Usage: node scripts/trigger-cron.mjs generate "October 2026" | reconcile  [--url <portal url>]');
  process.exit(1);
}

loadEnvLocal();
const secret = process.env.CRON_WEBHOOK_SECRET;
if (!secret) {
  console.error("CRON_WEBHOOK_SECRET is not set in .env.local.");
  process.exit(1);
}

const body = action === "generate" && month ? JSON.stringify({ month }) : "{}";
const res = await fetch(`${baseUrl}${routes[action]}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-cron-secret": secret },
  body,
}).catch((err) => {
  console.error(`Could not reach ${baseUrl}. Is the dev server running? (${err.cause?.code ?? err.message})`);
  process.exit(1);
});

console.log(`HTTP ${res.status}`);
console.log(await res.text());

#!/usr/bin/env node
/**
 * Prints the real tables and columns of the RISE LMS database, so
 * src/lib/lms-schema.ts can be corrected against the live schema instead of
 * guessed at.
 *
 * Reads only information_schema — no table data is selected.
 *
 * Usage:
 *   node scripts/inspect-lms-schema.mjs [keyword ...]
 *
 * Connection string is read from .env.local (SUPABASE_DB_URL, DATABASE_URL, or
 * SUPABASE_URL when it holds a postgres:// URL) or from the environment.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Default filter: enough to surface the feedback, meeting, program, profile and
// final-evaluation tables whatever they turn out to be called.
const DEFAULT_KEYWORDS = [
  "program",
  "meeting",
  "feedback",
  "profile",
  "eval",
  "student",
  "mentor",
  "coach",
  "review",
];

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const candidates = [
  process.env.SUPABASE_DB_URL,
  process.env.DATABASE_URL,
  process.env.SUPABASE_URL,
];
const connectionString = candidates.find((value) => value?.startsWith("postgres"));

if (!connectionString) {
  console.error(
    "No Postgres connection string found.\n" +
      "Set SUPABASE_DB_URL in .env.local to the value from\n" +
      "Supabase → Project Settings → Database → Connection string."
  );
  process.exit(1);
}

const keywords = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_KEYWORDS;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (err) {
  console.error(`Could not connect: ${err.message}`);
  process.exit(1);
}

try {
  const { rows } = await client.query(
    `SELECT c.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema
        AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position`
  );

  const byTable = new Map();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, []);
    byTable.get(row.table_name).push(row);
  }

  const allTables = [...byTable.keys()];
  const relevant = allTables.filter((name) =>
    keywords.some((keyword) => name.toLowerCase().includes(keyword.toLowerCase()))
  );

  console.log(`${allTables.length} tables in public; ${relevant.length} match the filter.\n`);

  for (const table of relevant) {
    console.log(table);
    for (const column of byTable.get(table)) {
      const nullable = column.is_nullable === "YES" ? "" : " NOT NULL";
      console.log(`    ${column.column_name}  ${column.data_type}${nullable}`);
    }
    console.log("");
  }

  console.log("--- every table in public, for reference ---");
  console.log(allTables.join("\n"));
} finally {
  await client.end();
}

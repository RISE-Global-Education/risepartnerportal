import { Pool, type QueryResultRow } from "pg";
import { unstable_cache } from "next/cache";

// The LMS Postgres connection string (Supabase pooler). SUPABASE_URL is
// accepted as a fallback because that is where it was first configured.
const CONNECTION_STRING = process.env.SUPABASE_DB_URL || process.env.SUPABASE_URL;

// Matches the Airtable layer's window: progress data barely changes
// second-to-second, so most navigations become cache hits rather than queries.
const CACHE_SECONDS = 60;

// Connecting directly authenticates as the table owner, which bypasses RLS
// (none of these tables set FORCE ROW LEVEL SECURITY) — so no service key is
// needed. It also means this module is server-only: it must never be imported
// from a client component. Authorization for the partner portal is enforced in
// the route handler, which checks the student belongs to the counselor behind
// the slug before any query here runs.
//
// The pool is cached on globalThis so the dev server's hot reload reuses it
// instead of leaking a new pool on every recompile.
const globalForPool = globalThis as unknown as { lmsPool?: Pool };

function getPool(): Pool {
  if (!CONNECTION_STRING) {
    throw new Error(
      "LMS database is not configured: set SUPABASE_DB_URL in .env.local to the " +
        "Supabase Postgres connection string."
    );
  }
  if (!CONNECTION_STRING.startsWith("postgres")) {
    throw new Error(
      "SUPABASE_DB_URL must be a postgres:// connection string " +
        "(Supabase → Project Settings → Database → Connection string)."
    );
  }

  if (!globalForPool.lmsPool) {
    globalForPool.lmsPool = new Pool({
      connectionString: CONNECTION_STRING,
      // Kept small deliberately: serverless instances each hold their own pool,
      // and the shared pooler has a finite number of slots.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    });
    globalForPool.lmsPool.on("error", (err) => {
      // An idle client erroring out must not take the process down; the pool
      // discards it and the next query opens a fresh connection.
      console.error("[LMS] Idle database client error:", err);
    });
  }
  return globalForPool.lmsPool;
}

async function runQuery<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[]
): Promise<T[]> {
  const { rows } = await getPool().query<T>(sql, params as unknown[]);
  return rows;
}

// unstable_cache tags are fixed at wrap time, so one wrapper is created per tag
// and reused rather than recreated per request.
type CachedRunner = (sql: string, params: readonly unknown[]) => Promise<unknown[]>;
const cachedRunnersByTag = new Map<string, CachedRunner>();

function getCachedRunner(tag: string): CachedRunner {
  let fn = cachedRunnersByTag.get(tag);
  if (!fn) {
    fn = unstable_cache(runQuery, ["lms-query", tag], {
      revalidate: CACHE_SECONDS,
      tags: [tag],
    });
    cachedRunnersByTag.set(tag, fn);
  }
  return fn;
}

/**
 * Runs a read query against the LMS database, cached for CACHE_SECONDS.
 *
 * `tag` groups cache entries for invalidation (e.g. "program-feedback"); the
 * SQL and its parameters form the cache key, so the same tag serves every
 * program. Values must always be passed as parameters — only identifiers drawn
 * from lms-schema.ts are ever interpolated into the SQL text.
 */
export async function query<T extends QueryResultRow>(
  tag: string,
  sql: string,
  params: readonly unknown[] = []
): Promise<T[]> {
  return (await getCachedRunner(tag)(sql, params)) as T[];
}

/** Normalizes a name for comparison: trimmed, case-folded, whitespace collapsed. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The SQL equivalent of normalizeName, for comparing against a column. */
export function normalizedNameSql(column: string): string {
  return `lower(regexp_replace(btrim(${column}), '\\s+', ' ', 'g'))`;
}

export function toStr(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  return null;
}

export function toBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

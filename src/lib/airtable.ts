import { unstable_cache, revalidateTag } from "next/cache";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_URL = "https://api.airtable.com/v0";

// Data barely changes second-to-second; caching this long turns most
// navigations into cache hits instead of a fresh full-table pull from Airtable.
const CACHE_SECONDS = 60;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

function tableTag(baseId: string, tableId: string): string {
  return `airtable:${baseId}:${tableId}`;
}

// Cache invalidation is best-effort: a mutation that already succeeded against
// Airtable must not be reported as failed just because revalidateTag couldn't
// run (e.g. its Next.js work-store invariant not being available in this
// context). Reads self-heal within CACHE_SECONDS regardless.
function safeRevalidate(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (err) {
    console.warn(`[Airtable] revalidateTag failed for ${tag}:`, err);
  }
}

// Airtable allows 5 requests/second per base and answers a burst with 429 and
// a 30-second lockout. A cold dashboard pages ~200 requests through one base
// and can trip it; throwing on that 429 used to fail the whole page. Requests
// aren't paced up front (that made every cold load ~50% slower and queued
// other pages behind the dashboard) — only a 429 makes the base wait it out.
const RATE_LIMIT_WAIT_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const lockedUntilByBase = new Map<string, number>();

async function airtableFetch(baseId: string, url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const wait = (lockedUntilByBase.get(baseId) ?? 0) - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return res;
    await res.body?.cancel();
    console.warn(`[Airtable] Rate limited on ${baseId} — retrying in ${RATE_LIMIT_WAIT_MS / 1000}s`);
    // Hold the whole base, not just this request: anything sent during the
    // lockout is rejected too and only prolongs it.
    lockedUntilByBase.set(baseId, Date.now() + RATE_LIMIT_WAIT_MS);
  }
}

async function fetchAllRecordsUncached(
  baseId: string,
  tableId: string,
  options?: {
    fields?: string[];
    filterByFormula?: string;
    view?: string;
  }
): Promise<AirtableRecord[]> {
  if (!AIRTABLE_TOKEN) return [];
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (options?.fields) {
      for (const field of options.fields) {
        params.append("fields[]", field);
      }
    }
    if (options?.filterByFormula) {
      params.set("filterByFormula", options.filterByFormula);
    }
    if (options?.view) {
      params.set("view", options.view);
    }
    if (offset) {
      params.set("offset", offset);
    }

    const url = `${BASE_URL}/${baseId}/${tableId}?${params.toString()}`;
    const res = await airtableFetch(baseId, url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.text();
      if (res.status === 401 || res.status === 403) {
        console.warn(`[Airtable] Auth error (${res.status}) on ${baseId}/${tableId} — returning empty`);
        return allRecords;
      }
      throw new Error(`Airtable API error (${res.status}): ${error}`);
    }

    const data: AirtableResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

// unstable_cache doesn't dedupe concurrent misses, so several people opening a
// cold page at once would each page the whole table. They share one pull
// instead.
const inFlightFetches = new Map<string, Promise<AirtableRecord[]>>();

function fetchAllRecordsShared(
  ...args: Parameters<typeof fetchAllRecordsUncached>
): Promise<AirtableRecord[]> {
  const key = JSON.stringify(args);
  let pending = inFlightFetches.get(key);
  if (!pending) {
    pending = fetchAllRecordsUncached(...args).finally(() => inFlightFetches.delete(key));
    inFlightFetches.set(key, pending);
  }
  return pending;
}

// unstable_cache tags are fixed at wrap-time, not per-call, so a wrapper is
// created once per (baseId, tableId) and reused — not recreated per request.
const cachedFetchersByTable = new Map<string, typeof fetchAllRecordsUncached>();

function getCachedFetcher(baseId: string, tableId: string) {
  const tag = tableTag(baseId, tableId);
  let fn = cachedFetchersByTable.get(tag);
  if (!fn) {
    fn = unstable_cache(fetchAllRecordsShared, ["airtable-fetch-all-records", tag], {
      revalidate: CACHE_SECONDS,
      tags: [tag],
    });
    cachedFetchersByTable.set(tag, fn);
  }
  return fn;
}

export async function fetchAllRecords(
  baseId: string,
  tableId: string,
  options?: {
    fields?: string[];
    filterByFormula?: string;
    view?: string;
  }
): Promise<AirtableRecord[]> {
  return getCachedFetcher(baseId, tableId)(baseId, tableId, options);
}

export function getField<T>(record: AirtableRecord, fieldName: string): T | null {
  const value = record.fields[fieldName];
  if (value === undefined || value === null) return null;
  return value as T;
}

export async function createRecord(
  baseId: string,
  tableId: string,
  fields: Record<string, unknown>,
  token?: string
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${baseId}/${tableId}`;
  const res = await airtableFetch(baseId, url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token || AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtable create error (${res.status}): ${error}`);
  }

  safeRevalidate(tableTag(baseId, tableId));
  return res.json();
}

export async function getRecord(
  baseId: string,
  tableId: string,
  recordId: string,
  token?: string
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${baseId}/${tableId}/${recordId}`;
  const res = await airtableFetch(baseId, url, {
    headers: {
      Authorization: `Bearer ${token || AIRTABLE_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtable get error (${res.status}): ${error}`);
  }

  return res.json();
}

export async function updateRecord(
  baseId: string,
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>,
  token?: string
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${baseId}/${tableId}/${recordId}`;
  const res = await airtableFetch(baseId, url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token || AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtable update error (${res.status}): ${error}`);
  }

  safeRevalidate(tableTag(baseId, tableId));
  return res.json();
}

export async function deleteRecord(
  baseId: string,
  tableId: string,
  recordId: string,
  token?: string
): Promise<void> {
  const url = `${BASE_URL}/${baseId}/${tableId}/${recordId}`;
  const res = await airtableFetch(baseId, url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token || AIRTABLE_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtable delete error (${res.status}): ${error}`);
  }

  safeRevalidate(tableTag(baseId, tableId));
}

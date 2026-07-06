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
    const res = await fetch(url, {
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

// unstable_cache tags are fixed at wrap-time, not per-call, so a wrapper is
// created once per (baseId, tableId) and reused — not recreated per request.
const cachedFetchersByTable = new Map<string, typeof fetchAllRecordsUncached>();

function getCachedFetcher(baseId: string, tableId: string) {
  const tag = tableTag(baseId, tableId);
  let fn = cachedFetchersByTable.get(tag);
  if (!fn) {
    fn = unstable_cache(fetchAllRecordsUncached, ["airtable-fetch-all-records", tag], {
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
  const res = await fetch(url, {
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

  revalidateTag(tableTag(baseId, tableId), { expire: 0 });
  return res.json();
}

export async function getRecord(
  baseId: string,
  tableId: string,
  recordId: string,
  token?: string
): Promise<AirtableRecord> {
  const url = `${BASE_URL}/${baseId}/${tableId}/${recordId}`;
  const res = await fetch(url, {
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
  const res = await fetch(url, {
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

  revalidateTag(tableTag(baseId, tableId), { expire: 0 });
  return res.json();
}

export async function deleteRecord(
  baseId: string,
  tableId: string,
  recordId: string,
  token?: string
): Promise<void> {
  const url = `${BASE_URL}/${baseId}/${tableId}/${recordId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token || AIRTABLE_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtable delete error (${res.status}): ${error}`);
  }

  revalidateTag(tableTag(baseId, tableId), { expire: 0 });
}

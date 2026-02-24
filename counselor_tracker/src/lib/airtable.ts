const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_URL = "https://api.airtable.com/v0";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export async function fetchAllRecords(
  baseId: string,
  tableId: string,
  options?: {
    fields?: string[];
    filterByFormula?: string;
  }
): Promise<AirtableRecord[]> {
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
    if (offset) {
      params.set("offset", offset);
    }

    const url = `${BASE_URL}/${baseId}/${tableId}?${params.toString()}`;
    console.log(`[Airtable] Fetching: ${baseId}/${tableId} (offset: ${offset || "none"})`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Airtable API error (${res.status}): ${error}`);
    }

    const data: AirtableResponse = await res.json();
    console.log(`[Airtable] Got ${data.records.length} records (total: ${allRecords.length + data.records.length})`);
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
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

  return res.json();
}

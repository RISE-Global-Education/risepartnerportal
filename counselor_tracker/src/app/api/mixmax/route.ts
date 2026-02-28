import { NextResponse } from "next/server";

export interface MixmaxRecipient {
  email: string;
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  sequenceName?: string;
  lastSentAt?: number | null; // unix ms
}

export interface MixmaxTotals {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface MixmaxInsightsResponse {
  totals: MixmaxTotals;
  recipients: MixmaxRecipient[];
  dateRange?: { start: string; end: string };
  cachedAt?: string; // ISO string of when data was last fetched
}

// ── Cache helpers (Airtable-backed) ───────────────────────────────────────────
//
// Requires a table named "_mixmax_cache" in your Airtable base with:
//   - "key"       (Single line text)  — identifier, always "mixmax"
//   - "fetchedAt" (Single line text)  — ISO timestamp
//   - "payload"   (Long text)         — JSON string of MixmaxInsightsResponse
//
// Set MIXMAX_CACHE_BASE and MIXMAX_CACHE_TABLE in your env vars, OR
// it defaults to the student pipeline base with table name "_mixmax_cache".

const CACHE_BASE  = process.env.MIXMAX_CACHE_BASE  ?? "appyvj8Xh10kGWbJN";
const CACHE_TABLE = process.env.MIXMAX_CACHE_TABLE ?? "_mixmax_cache";
const AIRTABLE_BASE = "https://api.airtable.com/v0";

export interface CacheFile {
  fetchedAt: string;
  data: MixmaxInsightsResponse;
}

export async function readCache(): Promise<CacheFile | null> {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) return null;
    const url = `${AIRTABLE_BASE}/${CACHE_BASE}/${CACHE_TABLE}?filterByFormula={key}="mixmax"&maxRecords=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const record = json.records?.[0];
    if (!record) return null;
    const fetchedAt: string = record.fields.fetchedAt;
    const payload: string = record.fields.payload;
    if (!fetchedAt || !payload) return null;
    return { fetchedAt, data: JSON.parse(payload) };
  } catch {
    return null;
  }
}

export async function writeCache(data: MixmaxInsightsResponse): Promise<void> {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) return;

    const fetchedAt = new Date().toISOString();
    const payload = JSON.stringify(data);

    // Check if record already exists
    const searchUrl = `${AIRTABLE_BASE}/${CACHE_BASE}/${CACHE_TABLE}?filterByFormula={key}="mixmax"&maxRecords=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const searchJson = await searchRes.json();
    const existing = searchJson.records?.[0];

    if (existing) {
      // Update existing record
      await fetch(`${AIRTABLE_BASE}/${CACHE_BASE}/${CACHE_TABLE}/${existing.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { fetchedAt, payload } }),
      });
    } else {
      // Create new record
      await fetch(`${AIRTABLE_BASE}/${CACHE_BASE}/${CACHE_TABLE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { key: "mixmax", fetchedAt, payload } }),
      });
    }
  } catch (err) {
    console.error("[Mixmax] writeCache failed:", err);
  }
}

/**
 * Returns true if the cache is still fresh.
 *
 * Logic:
 *   - Compute today's 9:30 AM IST as a UTC timestamp.
 *   - If current time is before today's 9:30 AM IST, use yesterday's 9:30 AM IST as the threshold.
 *   - Cache is fresh if fetchedAt >= threshold.
 */
export function isCacheFresh(fetchedAt: string): boolean {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

  const now = Date.now();
  const nowIST = now + IST_OFFSET_MS;

  // Build today's 9:30 AM IST in UTC
  const todayIST = new Date(nowIST);
  todayIST.setUTCHours(0, 0, 0, 0); // midnight IST in UTC representation
  const todayRefreshUTC = todayIST.getTime() + 9 * 60 * 60 * 1000 + 30 * 60 * 1000 - IST_OFFSET_MS;

  // If we haven't yet hit today's 9:30 AM IST, use yesterday's threshold
  const threshold = now >= todayRefreshUTC
    ? todayRefreshUTC
    : todayRefreshUTC - 24 * 60 * 60 * 1000;

  return new Date(fetchedAt).getTime() >= threshold;
}

// ── Mixmax API helpers ─────────────────────────────────────────────────────────

const BASE = "https://api.mixmax.com/v1";

async function mixmaxGet(path: string, apiKey: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-API-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mixmax ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

interface MixmaxStage {
  state: string;
  sentAt?: number | null;
  opens: number;
  clicks: number;
  replied: number;
  bounced: number;
}

interface MixmaxApiRecipient {
  to: { email: string; name?: string | null };
  stages: MixmaxStage[];
}

interface MixmaxSequence {
  _id: string;
  name: string;
}

export async function fetchFromMixmax(apiKey: string): Promise<MixmaxInsightsResponse> {
  // 1. Fetch all sequences (paginate if needed)
  const sequences: MixmaxSequence[] = [];
  let cursor: string | null = null;

  do {
    const url = cursor
      ? `/sequences?next=${encodeURIComponent(cursor)}&limit=50`
      : "/sequences?limit=50";
    const page = await mixmaxGet(url, apiKey);
    sequences.push(...(page.results ?? []));
    cursor = page.hasNext ? page.next : null;
  } while (cursor);

  // 2. For each sequence fetch recipients and aggregate stats
  // Sequential + delay to avoid Mixmax 429 rate limits
  const recipientMap = new Map<string, MixmaxRecipient>();

  for (const seq of sequences) {
    let offset = 0;
    const limit = 50;
    while (true) {
      const recipients: MixmaxApiRecipient[] = await mixmaxGet(
        `/sequences/${seq._id}/recipients?limit=${limit}&offset=${offset}`,
        apiKey
      );
      if (!Array.isArray(recipients) || recipients.length === 0) break;

      for (const r of recipients) {
        const email = r.to?.email ?? "";
        if (!email) continue;

        let sent = 0, opened = 0, clicked = 0, replied = 0, bounced = 0;
        let lastSentAt: number | null = null;
        for (const stage of r.stages ?? []) {
          if (stage.state === "sent" || stage.sentAt) {
            sent++;
            opened += stage.opens ?? 0;
            clicked += stage.clicks ?? 0;
            replied += stage.replied ?? 0;
            bounced += stage.bounced ?? 0;
            if (stage.sentAt && (!lastSentAt || stage.sentAt > lastSentAt)) {
              lastSentAt = stage.sentAt;
            }
          }
        }

        const key = `${email}::${seq._id}`;
        recipientMap.set(key, {
          email,
          name: r.to?.name ?? "",
          sent,
          opened,
          clicked,
          replied,
          bounced,
          sequenceName: seq.name,
          lastSentAt,
        });
      }

      if (recipients.length < limit) break;
      offset += limit;
      await new Promise((res) => setTimeout(res, 300));
    }
    await new Promise((res) => setTimeout(res, 300));
  }

  const recipients = Array.from(recipientMap.values()).sort(
    (a, b) => b.sent - a.sent
  );

  const sent = recipients.reduce((s, r) => s + r.sent, 0);
  const opened = recipients.reduce((s, r) => s + r.opened, 0);
  const clicked = recipients.reduce((s, r) => s + r.clicked, 0);
  const replied = recipients.reduce((s, r) => s + r.replied, 0);
  const bounced = recipients.reduce((s, r) => s + r.bounced, 0);

  const totals: MixmaxTotals = {
    sent,
    opened,
    clicked,
    replied,
    bounced,
    openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
    replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
  };

  return { totals, recipients };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.MIXMAX_API_KEY;

  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(
      { error: "MIXMAX_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const cached = await readCache();
    if (cached && isCacheFresh(cached.fetchedAt)) {
      return NextResponse.json({ ...cached.data, cachedAt: cached.fetchedAt });
    }

    console.log("[Mixmax] Cache stale or missing, fetching from API…");
    const data = await fetchFromMixmax(apiKey);
    await writeCache(data);

    return NextResponse.json({ ...data, cachedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Mixmax API fetch failed:", message);

    const cached = await readCache();
    if (cached) {
      console.warn("[Mixmax] Serving stale cache after fetch failure");
      return NextResponse.json({ ...cached.data, cachedAt: cached.fetchedAt });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

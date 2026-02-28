import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

// ── Cache helpers ──────────────────────────────────────────────────────────────

const CACHE_FILE = path.join(process.cwd(), ".mixmax-cache.json");

interface CacheFile {
  fetchedAt: string; // ISO string
  data: MixmaxInsightsResponse;
}

function readCache(): CacheFile | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as CacheFile;
  } catch {
    return null;
  }
}

export function writeCache(data: MixmaxInsightsResponse): void {
  const entry: CacheFile = { fetchedAt: new Date().toISOString(), data };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(entry), "utf-8");
}

/**
 * Returns true if the cache is still fresh.
 *
 * Logic:
 *   - Compute today's 9:30 AM IST as a UTC timestamp.
 *   - If current time is before today's 9:30 AM IST, use yesterday's 9:30 AM IST as the threshold.
 *   - Cache is fresh if fetchedAt >= threshold.
 */
function isCacheFresh(fetchedAt: string): boolean {
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
  const recipientMap = new Map<string, MixmaxRecipient>();

  await Promise.all(
    sequences.map(async (seq) => {
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
      }
    })
  );

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
    // Serve from cache if still fresh
    const cached = readCache();
    if (cached && isCacheFresh(cached.fetchedAt)) {
      return NextResponse.json({
        ...cached.data,
        cachedAt: cached.fetchedAt,
      });
    }

    // Cache is stale or missing — fetch fresh data
    console.log("[Mixmax] Cache stale or missing, fetching from API…");
    const data = await fetchFromMixmax(apiKey);
    writeCache(data);

    return NextResponse.json({ ...data, cachedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Mixmax API fetch failed:", message);

    // If fetch fails but we have a stale cache, serve it rather than erroring
    const cached = readCache();
    if (cached) {
      console.warn("[Mixmax] Serving stale cache after fetch failure");
      return NextResponse.json({ ...cached.data, cachedAt: cached.fetchedAt });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { Client } from "@upstash/qstash";
import { Redis } from "@upstash/redis";

export const SEQUENCES_KEY = "mixmax:sequences";
export const PARTIAL_KEY = "mixmax:partial";
export const PROGRESS_KEY = "mixmax:progress";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mixmaxGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.mixmax.com/v1${path}`, {
    headers: { "X-API-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mixmax ${path} → ${res.status}`);
  return res.json();
}

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Kicks off the chunked Mixmax → Redis refresh chain: lists sequences
 * (fast, metadata only), seeds Redis, and enqueues the first chunk via
 * QStash. Returns immediately — actual recipient data is fetched
 * asynchronously by /api/mixmax/process-chunk, chunk by chunk.
 *
 * If a chain is already in flight (SEQUENCES_KEY still set), this is a
 * no-op — it does NOT restart, since resetting state out from under a
 * running chain races with it and strands its progress counter. Callers
 * should poll /api/mixmax/status instead of re-triggering.
 *
 * Used by both the daily cron and the manual "Refresh" button, since
 * fetching every sequence's recipients synchronously is too slow for a
 * single serverless function invocation.
 */
export async function startMixmaxRefresh(
  apiKey: string
): Promise<{ sequences: number; alreadyRunning: boolean }> {
  const redis = getRedis();

  const existing = await redis.get<{ _id: string; name: string }[]>(SEQUENCES_KEY);
  if (existing) {
    return { sequences: existing.length, alreadyRunning: true };
  }

  const sequences: { _id: string; name: string }[] = [];
  let cursor: string | null = null;
  do {
    const url = cursor
      ? `/sequences?next=${encodeURIComponent(cursor)}&limit=50`
      : "/sequences?limit=50";
    const page = await mixmaxGet(url, apiKey);
    sequences.push(...(page.results ?? []).map((s: { _id: string; name: string }) => ({ _id: s._id, name: s.name })));
    cursor = page.hasNext ? page.next : null;
  } while (cursor);

  await redis.set(SEQUENCES_KEY, sequences, { ex: 2 * 60 * 60 });
  await redis.del(PARTIAL_KEY);
  await redis.set(PROGRESS_KEY, 0, { ex: 2 * 60 * 60 });

  const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  await qstash.publishJSON({
    url: `${baseUrl}/api/mixmax/process-chunk`,
    body: { nextIndex: 0 },
  });

  return { sequences: sequences.length, alreadyRunning: false };
}

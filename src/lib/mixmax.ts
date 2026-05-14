/**
 * Shared helper for server components that need Mixmax recipient data.
 * Calls the cache/fetch logic directly — no HTTP round-trip needed.
 */
import { readCache, isCacheFresh, fetchFromMixmax, writeCache } from "@/app/api/mixmax/route";
import type { MixmaxRecipient } from "@/app/api/mixmax/route";

export interface MixmaxData {
  recipients: MixmaxRecipient[];
  cachedAt: string | null;
}

export async function getMixmaxData(): Promise<MixmaxData> {
  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return { recipients: [], cachedAt: null };
  }

  try {
    const cached = await readCache();
    if (cached && isCacheFresh(cached.fetchedAt)) {
      return { recipients: cached.data.recipients, cachedAt: cached.fetchedAt };
    }
    const data = await fetchFromMixmax(apiKey);
    await writeCache(data);
    return { recipients: data.recipients, cachedAt: new Date().toISOString() };
  } catch {
    const cached = await readCache();
    if (cached) return { recipients: cached.data.recipients, cachedAt: cached.fetchedAt };
    return { recipients: [], cachedAt: null };
  }
}

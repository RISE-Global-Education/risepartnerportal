import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { Redis } from "@upstash/redis";

const MIXMAX_USER_ID = "68416315ed588cc0a766f5eb";
const SEQUENCES_KEY = "mixmax:sequences";
const PARTIAL_KEY = "mixmax:partial";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mixmaxGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.mixmax.com/v1${path}`, {
    headers: { "X-API-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mixmax ${path} → ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "MIXMAX_API_KEY not configured" }, { status: 503 });
  }

  try {
    // Fetch sequence list (fast — metadata only)
    const sequences: { _id: string; name: string }[] = [];
    let cursor: string | null = null;
    do {
      const url = cursor
        ? `/sequences?next=${encodeURIComponent(cursor)}&limit=50`
        : "/sequences?limit=50";
      const page = await mixmaxGet(url, apiKey);
      const mine = (page.results ?? []).filter((s: { userId: string }) => s.userId === MIXMAX_USER_ID);
      sequences.push(...mine.map((s: { _id: string; name: string }) => ({ _id: s._id, name: s.name })));
      cursor = page.hasNext ? page.next : null;
    } while (cursor);

    // Store sequences + reset partial in Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.set(SEQUENCES_KEY, sequences, { ex: 2 * 60 * 60 });
    await redis.del(PARTIAL_KEY);

    // Kick off first chunk via QStash
    const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    await qstash.publishJSON({
      url: `${baseUrl}/api/mixmax/process-chunk`,
      body: { nextIndex: 0 },
    });

    console.log(`[Cron/Mixmax] Kicked off QStash chain — ${sequences.length} sequences`);
    return NextResponse.json({ ok: true, sequences: sequences.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron/Mixmax] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

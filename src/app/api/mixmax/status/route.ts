import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { SEQUENCES_KEY, PROGRESS_KEY } from "@/lib/mixmax-refresh";

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/** Reports whether the chunked Mixmax refresh chain is currently running. */
export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ running: false });

  const sequences = await redis.get<{ _id: string; name: string }[]>(SEQUENCES_KEY);
  if (!sequences) return NextResponse.json({ running: false });

  const progress = (await redis.get<number>(PROGRESS_KEY)) ?? 0;
  return NextResponse.json({ running: true, progress, total: sequences.length });
}

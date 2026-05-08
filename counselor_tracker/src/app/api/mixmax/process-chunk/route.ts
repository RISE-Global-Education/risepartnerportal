import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Client } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import { writeCache } from "@/app/api/mixmax/route";
import type { MixmaxRecipient, MixmaxInsightsResponse } from "@/app/api/mixmax/route";

const MIXMAX_USER_ID = "68416315ed588cc0a766f5eb";
const CHUNK_SIZE = 7;
const PARTIAL_KEY = "mixmax:partial";
const SEQUENCES_KEY = "mixmax:sequences";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function getQStash() {
  return new Client({ token: process.env.QSTASH_TOKEN! });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mixmaxGet(path: string, apiKey: string, attempt = 0): Promise<any> {
  const res = await fetch(`https://api.mixmax.com/v1${path}`, {
    headers: { "X-API-Token": apiKey },
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 4) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "0", 10);
    const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(2000 * 2 ** attempt, 20000);
    await sleep(delay);
    return mixmaxGet(path, apiKey, attempt + 1);
  }
  if (!res.ok) throw new Error(`Mixmax ${path} → ${res.status}`);
  return res.json();
}

function buildFinalCache(recipients: MixmaxRecipient[]): MixmaxInsightsResponse {
  const sorted = [...recipients].sort((a, b) => b.sent - a.sent);
  const sent = sorted.reduce((s, r) => s + r.sent, 0);
  const opened = sorted.reduce((s, r) => s + r.opened, 0);
  const clicked = sorted.reduce((s, r) => s + r.clicked, 0);
  const replied = sorted.reduce((s, r) => s + r.replied, 0);
  const bounced = sorted.reduce((s, r) => s + r.bounced, 0);
  return {
    totals: {
      sent, opened, clicked, replied, bounced,
      openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
      replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
    },
    recipients: sorted,
  };
}

interface ChunkPayload {
  nextIndex: number;
}

async function handler(req: NextRequest) {
  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "MIXMAX_API_KEY not configured" }, { status: 503 });
  }

  const body: ChunkPayload = await req.json();
  const { nextIndex } = body;

  const redis = getRedis();

  // Load sequences and partial results from Redis
  const sequences = await redis.get<{ _id: string; name: string }[]>(SEQUENCES_KEY);
  if (!sequences) {
    return NextResponse.json({ error: "No sequences found in Redis — cron may not have run" }, { status: 400 });
  }

  const partial = (await redis.get<MixmaxRecipient[]>(PARTIAL_KEY)) ?? [];
  const chunk = sequences.slice(nextIndex, nextIndex + CHUNK_SIZE);

  // Fetch recipients for this chunk
  const newRecipients: MixmaxRecipient[] = [];
  for (const seq of chunk) {
    let offset = 0;
    while (true) {
      const recipients = await mixmaxGet(
        `/sequences/${seq._id}/recipients?limit=50&offset=${offset}`,
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
            if (stage.sentAt && (!lastSentAt || stage.sentAt > lastSentAt)) lastSentAt = stage.sentAt;
          }
        }
        newRecipients.push({ email, name: r.to?.name ?? "", sent, opened, clicked, replied, bounced, sequenceName: seq.name, lastSentAt });
      }
      if (recipients.length < 50) break;
      offset += 50;
      await sleep(1000);
    }
    await sleep(800);
  }

  const merged = [...partial, ...newRecipients];
  const newNextIndex = nextIndex + CHUNK_SIZE;
  const done = newNextIndex >= sequences.length;

  // Always write interim cache so page stays fresh
  await writeCache(buildFinalCache(merged));

  if (done) {
    await redis.del(PARTIAL_KEY);
    await redis.del(SEQUENCES_KEY);
    console.log(`[QStash/Mixmax] Complete — ${merged.length} recipients`);
    return NextResponse.json({ ok: true, done: true, recipients: merged.length });
  }

  // Save merged partial back to Redis
  await redis.set(PARTIAL_KEY, merged, { ex: 2 * 60 * 60 });

  // Enqueue next chunk — only passes the index, not the data
  const qstash = getQStash();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  await qstash.publishJSON({
    url: `${baseUrl}/api/mixmax/process-chunk`,
    body: { nextIndex: newNextIndex } satisfies ChunkPayload,
  });

  console.log(`[QStash/Mixmax] Chunk done — ${newNextIndex}/${sequences.length}`);
  return NextResponse.json({ ok: true, done: false, progress: `${newNextIndex}/${sequences.length}` });
}

export const POST = verifySignatureAppRouter(handler);

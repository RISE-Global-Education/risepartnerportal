import { NextRequest, NextResponse } from "next/server";
import { startMixmaxRefresh } from "@/lib/mixmax-refresh";

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
    const { sequences, alreadyRunning } = await startMixmaxRefresh(apiKey);
    console.log(
      alreadyRunning
        ? `[Cron/Mixmax] Chain already in flight — ${sequences} sequences, skipping restart`
        : `[Cron/Mixmax] Kicked off QStash chain — ${sequences} sequences`
    );
    return NextResponse.json({ ok: true, sequences, alreadyRunning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron/Mixmax] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

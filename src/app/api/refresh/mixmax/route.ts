import { NextResponse } from "next/server";
import { startMixmaxRefresh } from "@/lib/mixmax-refresh";

export async function POST() {
  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "MIXMAX_API_KEY not configured" }, { status: 503 });
  }

  try {
    const { sequences, alreadyRunning } = await startMixmaxRefresh(apiKey);
    return NextResponse.json({ ok: true, started: true, total: sequences, alreadyRunning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

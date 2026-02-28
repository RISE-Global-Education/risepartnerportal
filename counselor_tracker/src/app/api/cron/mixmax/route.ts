import { NextRequest, NextResponse } from "next/server";
import { fetchFromMixmax, writeCache } from "@/app/api/mixmax/route";

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or an authorised caller)
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(
      { error: "MIXMAX_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    console.log("[Cron] Fetching fresh Mixmax data…");
    const data = await fetchFromMixmax(apiKey);
    writeCache(data);
    console.log("[Cron] Mixmax cache refreshed at", new Date().toISOString());
    return NextResponse.json({ ok: true, cachedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron] Mixmax fetch failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

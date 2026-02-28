import { NextResponse } from "next/server";
import { fetchFromMixmax, writeCache } from "@/app/api/mixmax/route";

export async function POST() {
  const apiKey = process.env.MIXMAX_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json({ error: "MIXMAX_API_KEY not configured" }, { status: 503 });
  }

  try {
    const data = await fetchFromMixmax(apiKey);
    writeCache(data);
    return NextResponse.json({ ok: true, cachedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

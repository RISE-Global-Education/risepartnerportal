import { NextResponse } from "next/server";
import { readCache } from "@/app/api/mixmax/route";

export async function GET() {
  const cached = await readCache();
  if (!cached) {
    return NextResponse.json({ error: "No cache. Visit /insights/mixmax first to populate it." }, { status: 404 });
  }

  const names = Array.from(
    new Set(cached.data.recipients.map((r) => r.sequenceName ?? "(none)"))
  ).sort();

  return NextResponse.json({ count: names.length, sequences: names });
}

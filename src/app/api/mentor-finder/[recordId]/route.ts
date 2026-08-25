import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";
import { MENTOR_RATE_PATTERN, MENTOR_RATE_HINT } from "@/lib/rate-format";

const MENTOR_PIPELINE_BASE = "appFavjto15k519od";
const MENTOR_INFO_TABLE = "tblt4vfMm1tiywIeQ";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const { recordId } = await params;
  const { rate } = await req.json();

  if (typeof rate !== "string" || !MENTOR_RATE_PATTERN.test(rate)) {
    return NextResponse.json({ error: MENTOR_RATE_HINT }, { status: 400 });
  }

  try {
    await updateRecord(MENTOR_PIPELINE_BASE, MENTOR_INFO_TABLE, recordId, { Rate: rate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update rate";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, rate });
}

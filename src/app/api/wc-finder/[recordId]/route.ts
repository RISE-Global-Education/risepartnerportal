import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";
import { WC_RATE_PATTERN, WC_RATE_HINT } from "@/lib/rate-format";

const WC_PIPELINE_BASE = "appFavjto15k519od";
const WC_INFO_TABLE = "tblnb27SRJjEjgKcO";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const { recordId } = await params;
  const { rate } = await req.json();

  if (typeof rate !== "string" || !WC_RATE_PATTERN.test(rate)) {
    return NextResponse.json({ error: WC_RATE_HINT }, { status: 400 });
  }

  await updateRecord(WC_PIPELINE_BASE, WC_INFO_TABLE, recordId, { Rate: rate });
  return NextResponse.json({ ok: true, rate });
}

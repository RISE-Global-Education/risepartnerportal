import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { lastClosedBillLabel } from "@/lib/bill-id";
import { INVOICES_CACHE_TAG } from "@/lib/counselor-invoices";
import {
  generateInvoicesForMonth,
  InvalidMonthError,
} from "@/lib/counselor-invoice-generate";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called by the Supabase pg_cron job on the 26th of each month (see
// scripts/create-counselor-invoices.sql). It bills the period that just ended,
// the 26th of last month to the 26th of this one.
// A body of {"month": "October 2026"} backfills a specific month instead.
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_WEBHOOK_SECRET;
  if (!expected || !secretMatches(request.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requested = typeof body?.month === "string" ? body.month : null;

  try {
    const result = await generateInvoicesForMonth(requested ?? lastClosedBillLabel());
    try {
      revalidateTag(INVOICES_CACHE_TAG, { expire: 0 });
    } catch (err) {
      console.warn("[Invoices] revalidateTag failed:", err);
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InvalidMonthError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[Invoices] Generate failed:", err);
    return NextResponse.json({ error: "Generate failed" }, { status: 500 });
  }
}

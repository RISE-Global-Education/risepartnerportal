import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { INVOICES_CACHE_TAG } from "@/lib/counselor-invoices";
import {
  InvalidCutoffError,
  reconcileCounselorInvoices,
} from "@/lib/counselor-invoice-reconcile";
import { DriveNotConfiguredError } from "@/lib/drive-invoices";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called once a day by the Supabase pg_cron job (see
// scripts/create-counselor-invoices.sql). Never open to the public: with no
// secret configured, every request is refused.
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_WEBHOOK_SECRET;
  if (!expected || !secretMatches(request.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileCounselorInvoices();
    try {
      revalidateTag(INVOICES_CACHE_TAG, { expire: 0 });
    } catch (err) {
      // Reads self-heal within the cache window regardless.
      console.warn("[Invoices] revalidateTag failed:", err);
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DriveNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof InvalidCutoffError) {
      // Fail closed: do nothing rather than risk marking old bills Paid.
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("[Invoices] Reconcile failed:", err);
    return NextResponse.json({ error: "Reconcile failed" }, { status: 500 });
  }
}

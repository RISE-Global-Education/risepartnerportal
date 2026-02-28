import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/dashboard/[secret]/insights/airtable", "page");
  revalidatePath("/dashboard/[secret]/insights/shortlisting", "page");
  revalidatePath("/dashboard/[secret]/insights/parents-discovery-booking", "page");
  revalidatePath("/dashboard/[secret]/insights/parents-discovery-form", "page");
  console.log("[Cron] Airtable-backed insights pages revalidated at", new Date().toISOString());

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}

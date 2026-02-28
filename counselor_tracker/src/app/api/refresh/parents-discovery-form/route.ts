import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
  revalidatePath("/dashboard/[secret]/insights/parents-discovery-form", "page");
  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
  revalidatePath("/[secret]/insights/shortlisting", "page");
  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}

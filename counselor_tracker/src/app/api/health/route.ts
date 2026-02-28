import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

export type { HealthVar, HealthResponse } from "@/lib/health";

export async function GET() {
  return NextResponse.json(getHealth());
}

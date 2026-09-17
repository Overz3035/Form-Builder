import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/mysql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await checkHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}

import { NextResponse } from "next/server";
import { getDbInfo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const info = await getDbInfo();
    return NextResponse.json({ info });
  } catch (e) {
    const err = e as Error & { code?: string };
    return NextResponse.json(
      { error: err.message || "خطا در دریافت اطلاعات دیتابیس" },
      { status: 503 }
    );
  }
}

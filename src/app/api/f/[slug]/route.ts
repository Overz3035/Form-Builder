import { NextRequest, NextResponse } from "next/server";
import { DbError, getFormBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const form = await getFormBySlug(slug);
    if (!form) return NextResponse.json({ error: "فرم یافت نشد" }, { status: 404 });
    return NextResponse.json({ form });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

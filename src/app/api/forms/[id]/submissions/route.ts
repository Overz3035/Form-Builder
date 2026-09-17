import { NextRequest, NextResponse } from "next/server";
import { DbError, deleteSubmission, getSubmissions } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const table = req.nextUrl.searchParams.get("table");
    if (!table) return NextResponse.json({ error: "نام جدول مشخص نیست" }, { status: 400 });
    const submissions = await getSubmissions(table);
    return NextResponse.json({ submissions, formId: id });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ctx.params;
    const table = req.nextUrl.searchParams.get("table");
    const submissionId = Number(req.nextUrl.searchParams.get("submissionId"));
    if (!table || !submissionId) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 });
    }
    await deleteSubmission(table, submissionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

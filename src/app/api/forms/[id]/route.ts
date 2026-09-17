import { NextRequest, NextResponse } from "next/server";
import type { FormSchema } from "@/types";
import { DbError, deleteForm, getForm, updateForm } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const form = await getForm(id);
    if (!form) return NextResponse.json({ error: "فرم یافت نشد" }, { status: 404 });
    return NextResponse.json({ form });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { form: FormSchema };
    if (!body?.form?.id) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
    const existing = await getForm(id);
    if (!existing) return NextResponse.json({ error: "فرم یافت نشد" }, { status: 404 });
    const updated = await updateForm(id, body.form);
    return NextResponse.json({ form: updated });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteForm(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

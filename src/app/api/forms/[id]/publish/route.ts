import { NextRequest, NextResponse } from "next/server";
import type { FormSchema } from "@/types";
import { DbError, publishForm, uniqueTableName } from "@/lib/db";
import { getForm } from "@/lib/db";
import { slugifyLatin } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { form: FormSchema };
    if (!body?.form) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
    const form = body.form;
    if (!form.table) {
      form.table = await uniqueTableName(`form_${slugifyLatin(form.name)}`, id);
    }
    const result = await publishForm(form);
    const updated = await getForm(id);
    return NextResponse.json({ result, form: updated });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createForm, listForms } from "@/lib/db";
import { DbError } from "@/lib/db";
import { emptyForm } from "@/store/builder-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const forms = await listForms();
    return NextResponse.json({ forms });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json(
      { error: err.message, hint: err.hint },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; slug?: string; template?: string };
    const form = emptyForm(body.name || "فرم جدید");
    if (body.slug) form.slug = body.slug;
    if (body.template) {
      const { getTemplate } = await import("@/templates");
      const tpl = getTemplate(body.template);
      if (!tpl) return NextResponse.json({ error: "قالب یافت نشد" }, { status: 404 });
      const built = tpl.build();
      form.name = body.name || built.name;
      form.description = built.description;
      form.fields = built.fields;
      form.settings = built.settings;
      form.sms = built.sms;
    }
    const created = await createForm(form);
    return NextResponse.json({ form: created }, { status: 201 });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

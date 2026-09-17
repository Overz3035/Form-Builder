import { NextRequest, NextResponse } from "next/server";
import type { FieldConfig } from "@/types";
import { DbError, getFormBySlug, insertSubmission } from "@/lib/db";
import { resolveColumns } from "@/lib/generator/columns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function rawString(raw: unknown): string {
  if (Array.isArray(raw)) return raw.join(",");
  if (typeof raw === "boolean") return raw ? "1" : "";
  if (typeof raw === "number") return String(raw);
  return typeof raw === "string" ? raw.trim() : "";
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toEn(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

function checkFieldRules(field: FieldConfig, value: string): string | null {
  if (value === "") return null;
  const en = toEn(value);
  for (const rule of field.validation || []) {
    switch (rule.type) {
      case "minLength":
        if (typeof rule.value === "number" && value.length < rule.value) return rule.message;
        break;
      case "maxLength":
        if (typeof rule.value === "number" && value.length > rule.value) return rule.message;
        break;
      case "min":
        if (typeof rule.value === "number" && Number(en) < rule.value) return rule.message;
        break;
      case "max":
        if (typeof rule.value === "number" && Number(en) > rule.value) return rule.message;
        break;
      case "pattern":
        if (typeof rule.value === "string" && rule.value) {
          try {
            if (!new RegExp(rule.value).test(value)) return rule.message;
          } catch {
            /* invalid pattern ignored */
          }
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return rule.message;
        break;
      case "phone":
        if (!/^(\+98|0098|98|0)?9\d{9}$/.test(en)) return rule.message || "شماره موبایل معتبر وارد کنید";
        break;
      default:
        break;
    }
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "ایمیل معتبر وارد کنید.";
  }
  if (field.type === "phone" && !/^(\+98|0098|98|0)?9\d{9}$/.test(en)) {
    return "شماره موبایل معتبر وارد کنید.";
  }
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const form = await getFormBySlug(slug);
    if (!form) return NextResponse.json({ error: "فرم یافت نشد" }, { status: 404 });
    if (form.status !== "published") {
      return NextResponse.json({ error: "این فرم هنوز منتشر نشده است" }, { status: 403 });
    }
    if (!form.table) return NextResponse.json({ error: "جدول پاسخ‌ها تعریف نشده است" }, { status: 409 });

    const body = (await req.json()) as Record<string, unknown>;
    const resolved = resolveColumns(form);

    const values = resolved.map((c) => {
      const raw = body[c.field.id];
      if (Array.isArray(raw)) return raw.join(",");
      if (typeof raw === "boolean") return raw ? 1 : 0;
      if (typeof raw === "number") return raw;
      const s = typeof raw === "string" ? raw.trim() : "";
      return s === "" ? null : s;
    });

    const requiredMissing = resolved.filter((c) => {
      const s = rawString(body[c.field.id]);
      return c.field.required && s === "";
    });
    if (requiredMissing.length > 0) {
      return NextResponse.json(
        { error: `فیلدهای الزامی تکمیل نشده: ${requiredMissing.map((c) => c.field.label).join("، ")}` },
        { status: 422 }
      );
    }

    const ruleErrors: string[] = [];
    for (const c of resolved) {
      const msg = checkFieldRules(c.field, rawString(body[c.field.id]));
      if (msg) ruleErrors.push(`${c.field.label}: ${msg}`);
    }
    if (ruleErrors.length > 0) {
      return NextResponse.json({ error: ruleErrors.join("؛ ") }, { status: 422 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    await insertSubmission(form.table, resolved.map((c) => c.name), values, ip);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    const err = e as DbError;
    return NextResponse.json({ error: err.message, hint: err.hint }, { status: 503 });
  }
}

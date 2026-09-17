import { NextRequest, NextResponse } from "next/server";
import type { FormSchema } from "@/types";
import { generatePhp } from "@/lib/generator/php";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ctx.params;
    const body = (await req.json()) as { form?: FormSchema };
    if (!body?.form?.table) {
      return NextResponse.json({ error: "ابتدا فرم را منتشر کنید تا نام جدول مشخص شود" }, { status: 400 });
    }
    const settings = await getSettings();
    const php = generatePhp(body.form, {
      apiKey: settings.sms.apiKey,
      lineNumber: settings.sms.lineNumber,
    });
    return new NextResponse(php, {
      headers: {
        "Content-Type": "application/x-httpd-php; charset=utf-8",
        "Content-Disposition": `attachment; filename="index.php"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "خطا در تولید فایل" }, { status: 500 });
  }
}

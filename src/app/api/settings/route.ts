import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, settingsExist } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  const configured = await settingsExist();
  return NextResponse.json({ settings, configured });
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      db?: Record<string, unknown>;
      sms?: Record<string, unknown>;
    };
    if (!body || (typeof body.db === "undefined" && typeof body.sms === "undefined")) {
      return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
    }
    const settings = await saveSettings({
      db: body.db as never,
      sms: body.sms as never,
    });
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "خطا در ذخیره تنظیمات" }, { status: 500 });
  }
}

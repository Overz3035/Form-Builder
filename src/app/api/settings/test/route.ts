import { NextRequest, NextResponse } from "next/server";
import { testDbConnection } from "@/lib/mysql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      host?: unknown;
      port?: unknown;
      user?: unknown;
      password?: unknown;
    } | null;
    const port = Number(body?.port);
    const result = await testDbConnection({
      host: String(body?.host || "").trim(),
      port: Number.isFinite(port) ? Math.trunc(port) : 0,
      user: String(body?.user ?? ""),
      password: String(body?.password ?? ""),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 200 });
  }
}

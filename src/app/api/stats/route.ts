import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import { listForms } from "@/lib/db";
import { getDataName, withConnection } from "@/lib/mysql";
import { sanitizeIdentifier } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const forms = await listForms();
    const data = await getDataName();
    let submissions = 0;
    const tables = [...new Set(forms.filter((f) => f.status === "published" && f.table).map((f) => f.table))];
    await Promise.all(
      tables.map(async (t) => {
        try {
          const safe = sanitizeIdentifier(t);
          const rows = await withConnection(async (conn) => {
            const [r] = await conn.query<RowDataPacket[]>(
              `SELECT COUNT(*) AS c FROM \`${data}\`.\`${safe}\``
            );
            return r;
          });
          submissions += Number(rows[0]?.c || 0);
        } catch {
          /* table might not exist yet */
        }
      })
    );
    return NextResponse.json({
      totalForms: forms.length,
      published: forms.filter((f) => f.status === "published").length,
      drafts: forms.filter((f) => f.status === "draft").length,
      submissions,
    });
  } catch {
    return NextResponse.json({ totalForms: 0, published: 0, drafts: 0, submissions: 0 });
  }
}

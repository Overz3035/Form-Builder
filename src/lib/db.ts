import type { RowDataPacket } from "mysql2/promise";
import type { FormSchema, FormStatus } from "@/types";
import {
  ensureMetaSchema,
  getDataName,
  getDbConfig,
  getMetaName,
  withConnection,
} from "@/lib/mysql";
import { sanitizeIdentifier as sanitizeIdentifierSafe } from "@/lib/utils";
import { resolveColumns } from "@/lib/generator/columns";

export class DbError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

function mapError(e: unknown): never {
  const err = e as NodeJS.ErrnoException & { code?: string; sqlMessage?: string };
  if (err.code === "ER_ACCESS_DENIED_ERROR") {
    throw new DbError(
      "دسترسی MySQL رد شد (Access denied)",
      "در phpMyAdmin سرور اجرا کنید: CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY ''; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%'; FLUSH PRIVILEGES;"
    );
  }
  if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND") {
    throw new DbError("سرور MySQL در دسترس نیست", "پورت 3307 و فایروال سرور را بررسی کنید.");
  }
  if (err.code === "ER_DBACCESS_DENIED_ERROR") {
    throw new DbError("دسترسی به دیتابیس رد شد", err.sqlMessage);
  }
  throw new DbError(err.sqlMessage || err.message || "خطای دیتابیس");
}

interface FormRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  table: string;
  description: string | null;
  status: FormStatus;
  published_at: string | null;
  schema_json: string;
  created_at: string;
  updated_at: string;
}

function rowToForm(row: FormRow): FormSchema {
  let parsed: Partial<FormSchema> = {};
  try {
    parsed = JSON.parse(row.schema_json);
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    table: row.table,
    description: row.description || "",
    status: row.status,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    fields: Array.isArray(parsed.fields) ? parsed.fields : [],
    settings: parsed.settings || {
      submitText: "ثبت اطلاعات",
      successMessage: "اطلاعات شما با موفقیت ثبت شد. سپاس از همراهی شما.",
      theme: "dark",
    },
    sms: parsed.sms || {
      enabled: false,
      mode: "verify",
      templateId: "",
      parameters: [],
      message: "",
      apiKey: "",
      lineNumber: "",
    },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listForms(): Promise<FormSchema[]> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<FormRow[]>(`SELECT * FROM \`${meta}\`.\`forms\` ORDER BY updated_at DESC`);
      return r;
    });
    return rows.map(rowToForm);
  } catch (e) {
    mapError(e);
  }
}

export async function getForm(id: string): Promise<FormSchema | null> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<FormRow[]>(`SELECT * FROM \`${meta}\`.\`forms\` WHERE id = ?`, [id]);
      return r;
    });
    return rows[0] ? rowToForm(rows[0]) : null;
  } catch (e) {
    mapError(e);
  }
}

export async function getFormBySlug(slug: string): Promise<FormSchema | null> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<FormRow[]>(`SELECT * FROM \`${meta}\`.\`forms\` WHERE slug = ?`, [slug]);
      return r;
    });
    return rows[0] ? rowToForm(rows[0]) : null;
  } catch (e) {
    mapError(e);
  }
}

export async function createForm(form: FormSchema): Promise<FormSchema> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    await withConnection(async (conn) => {
      await conn.query(
        `INSERT INTO \`${meta}\`.\`forms\` (id, name, slug, \`table\`, description, status, schema_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [form.id, form.name, form.slug, form.table, form.description, form.status, JSON.stringify(form)]
      );
    });
    return form;
  } catch (e) {
    mapError(e);
  }
}

export async function updateForm(id: string, form: FormSchema): Promise<FormSchema> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    await withConnection(async (conn) => {
      await conn.query(
        `UPDATE \`${meta}\`.\`forms\` SET name = ?, slug = ?, \`table\` = ?, description = ?, status = ?, schema_json = ? WHERE id = ?`,
        [form.name, form.slug, form.table, form.description, form.status, JSON.stringify(form), id]
      );
    });
    return form;
  } catch (e) {
    mapError(e);
  }
}

export async function deleteForm(id: string): Promise<void> {
  try {
    await ensureMetaSchema();
    const meta = await getMetaName();
    await withConnection(async (conn) => {
      await conn.query(`DELETE FROM \`${meta}\`.\`forms\` WHERE id = ?`, [id]);
    });
  } catch (e) {
    mapError(e);
  }
}

export interface PublishResult {
  table: string;
  columns: { name: string; type: string }[];
  created: boolean;
}

export async function ensureDataTable(form: FormSchema): Promise<{ table: string; columns: { name: string; type: string }[] }> {
  const data = await getDataName();
  const table = sanitizeIdentifierSafe(form.table);
  if (!table) throw new DbError("نام جدول پاسخ‌ها نامعتبر است");
  const resolved = resolveColumns(form);
  await withConnection(async (conn) => {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${data}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const colDefs = [
      "`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      ...resolved.map((c) => `\`${c.name}\` ${c.sqlType} NULL`),
      "`submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "`ip` VARCHAR(64) NULL",
    ].join(", ");
    await conn.query(
      `CREATE TABLE IF NOT EXISTS \`${data}\`.\`${table}\` (${colDefs}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  });
  return { table, columns: resolved.map((c) => ({ name: c.name, type: c.sqlType })) };
}

export async function publishForm(form: FormSchema): Promise<PublishResult> {
  try {
    const ensured = await ensureDataTable(form);

    const meta = await getMetaName();
    await withConnection(async (conn) => {
      await conn.query(
        `UPDATE \`${meta}\`.\`forms\` SET status = 'published', published_at = IFNULL(published_at, NOW()), \`table\` = ? WHERE id = ?`,
        [ensured.table, form.id]
      );
    });

    return {
      table: ensured.table,
      columns: ensured.columns,
      created: true,
    };
  } catch (e) {
    mapError(e);
  }
}

export async function uniqueTableName(base: string, excludeFormId: string): Promise<string> {
  const data = await getDataName();
  const meta = await getMetaName();
  const clean = sanitizeIdentifierSafe(base) || "form";
  let candidate = clean;
  let n = 2;
  for (;;) {
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM \`${meta}\`.\`forms\` WHERE \`table\` = ? AND id != ? LIMIT 1`,
        [candidate, excludeFormId]
      );
      return r;
    });
    const existsInDb = await withConnection(async (conn) => {
      const [r] = await conn.query<RowDataPacket[]>(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [data, candidate]
      );
      return r;
    });
    if (rows.length === 0 && existsInDb.length === 0) return candidate;
    candidate = `${clean}_${n}`;
    n += 1;
    if (n > 50) return `${clean}_${Date.now().toString(36)}`;
  }
}

export interface SubmissionRow {
  id: number;
  submittedAt: string;
  ip: string | null;
  data: Record<string, string | number | null>;
}

export async function getSubmissions(tableName: string, limit = 500): Promise<SubmissionRow[]> {
  try {
    const data = await getDataName();
    const safe = sanitizeIdentifierSafe(tableName);
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM \`${data}\`.\`${safe}\` ORDER BY id DESC LIMIT ?`,
        [limit]
      );
      return r;
    });
    return rows.map((row) => {
      const { id, submitted_at, ip, ...rest } = row as Record<string, unknown>;
      return {
        id: Number(id),
        submittedAt: String(submitted_at),
        ip: ip ? String(ip) : null,
        data: rest as Record<string, string | number | null>,
      };
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { code?: string };
    if (err.code === "ER_NO_SUCH_TABLE") return [];
    mapError(e);
  }
}

export async function deleteSubmission(tableName: string, id: number): Promise<void> {
  try {
    const data = await getDataName();
    const safe = sanitizeIdentifierSafe(tableName);
    await withConnection(async (conn) => {
      await conn.query(`DELETE FROM \`${data}\`.\`${safe}\` WHERE id = ?`, [id]);
    });
  } catch (e) {
    mapError(e);
  }
}

export async function insertSubmission(
  tableName: string,
  columns: string[],
  values: (string | number | null)[],
  ip: string | null
): Promise<void> {
  try {
    const data = await getDataName();
    const safe = sanitizeIdentifierSafe(tableName);
    const colSql = ["`submitted_at`", "`ip`", ...columns.map((c) => `\`${sanitizeIdentifierSafe(c)}\``)].join(", ");
    const placeholders = ["NOW()", "?", ...values.map(() => "?")].join(", ");
    await withConnection(async (conn) => {
      await conn.query(`INSERT INTO \`${data}\`.\`${safe}\` (${colSql}) VALUES (${placeholders})`, [ip, ...values]);
    });
  } catch (e) {
    mapError(e);
  }
}

export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const data = await getDataName();
    const safe = sanitizeIdentifierSafe(tableName);
    if (!safe) return false;
    const rows = await withConnection(async (conn) => {
      const [r] = await conn.query<RowDataPacket[]>(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [data, safe]
      );
      return r;
    });
    return rows.length > 0;
  } catch {
    return false;
  }
}

export interface DbInfo {
  user: string;
  currentUser: string;
  host: string;
  port: number;
  databases: string[];
  dataDb: string;
  dataTables: string[];
}

export async function getDbInfo(): Promise<DbInfo> {
  const cfg = await getDbConfig();
  const data = await getDataName();
  return await withConnection(async (conn) => {
    const [u] = await conn.query<RowDataPacket[]>(`SELECT USER() AS u, CURRENT_USER() AS cu`);
    const [dbs] = await conn.query<RowDataPacket[]>(`SHOW DATABASES`);
    let dataTables: string[] = [];
    try {
      const [tbls] = await conn.query<RowDataPacket[]>(
        `SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
        [data]
      );
      dataTables = tbls.map((r) => String(r.t));
    } catch {
      dataTables = [];
    }
    return {
      user: String(u[0]?.u || ""),
      currentUser: String(u[0]?.cu || ""),
      host: cfg.host,
      port: cfg.port,
      databases: dbs.map((r) => String(Object.values(r)[0])),
      dataDb: data,
      dataTables,
    };
  });
}

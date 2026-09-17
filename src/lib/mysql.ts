import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import type { DbConfig } from "@/lib/mysql-types";

let cached: { fingerprint: string; pool: Pool } | null = null;

export function fingerprintOf(cfg: DbConfig, meta: string): string {
  return [cfg.host, cfg.port, cfg.user, cfg.password, meta].join("|");
}

export async function getDbConfig(): Promise<DbConfig> {
  const { getSettings } = await import("@/lib/settings");
  const s = await getSettings();
  return s.db;
}

export async function getMetaName(): Promise<string> {
  const { getSettings } = await import("@/lib/settings");
  return (await getSettings()).db.metaName;
}

export async function getDataName(): Promise<string> {
  const { getSettings } = await import("@/lib/settings");
  return (await getSettings()).db.dataName;
}

export async function getPool(): Promise<Pool> {
  const cfg = await getDbConfig();
  const meta = await getMetaName();
  const fingerprint = fingerprintOf(cfg, meta);
  if (!cached || cached.fingerprint !== fingerprint) {
    if (cached) {
      try {
        await cached.pool.end();
      } catch {
        /* ignore */
      }
      cached = null;
    }
    cached = {
      fingerprint,
      pool: mysql.createPool({
        ...cfg,
        waitForConnections: true,
        connectionLimit: 8,
        connectTimeout: 10000,
        charset: "utf8mb4_unicode_ci",
        dateStrings: true,
      }),
    };
  }
  return cached.pool;
}

export async function invalidatePool(): Promise<void> {
  if (cached) {
    try {
      await cached.pool.end();
    } catch {
      /* ignore */
    }
    cached = null;
  }
}

export async function withConnection<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}

export async function ensureMetaSchema(): Promise<void> {
  const meta = await getMetaName();
  await withConnection(async (conn) => {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${meta}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${meta}\``);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`forms\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(80) NOT NULL UNIQUE,
        \`table\` VARCHAR(80) NOT NULL DEFAULT '',
        \`description\` TEXT NULL,
        \`status\` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
        \`published_at\` DATETIME NULL,
        \`schema_json\` LONGTEXT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  });
}

export interface DbHealth {
  ok: boolean;
  message: string;
  hint?: string;
}

export async function checkHealth(): Promise<DbHealth> {
  try {
    const pool = await getPool();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 AS ok");
    if (Array.isArray(rows) && rows.length > 0) {
      return { ok: true, message: "اتصال به MySQL برقرار است" };
    }
    return { ok: false, message: "پاسخ نامعتبر از سرور MySQL" };
  } catch (err) {
    const cfg = await getDbConfig();
    const e = err as NodeJS.ErrnoException & { code?: string };
    if (e.code === "ER_ACCESS_DENIED_ERROR") {
      return {
        ok: false,
        message: "دسترسی MySQL رد شد (Access denied)",
        hint: `کاربر '${cfg.user}' اجازه اتصال به ${cfg.host}:${cfg.port} را ندارد. در صفحه تنظیمات مشخصات اتصال را بررسی کنید یا روی سرور دسترسی بدهید.`,
      };
    }
    if (e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT" || e.code === "ENOTFOUND") {
      return {
        ok: false,
        message: "سرور MySQL در دسترس نیست",
        hint: `اتصال به ${cfg.host}:${cfg.port} برقرار نشد. مشخصات را در صفحه تنظیمات بررسی کنید.`,
      };
    }
    return { ok: false, message: e.message || "خطای ناشناخته دیتابیس" };
  }
}

export async function testDbConnection(cfg: DbConfig): Promise<{ ok: boolean; message: string }> {
  let conn: mysql.PoolConnection | null = null;
  try {
    const pool = mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: 1,
      connectTimeout: 8000,
      charset: "utf8mb4_unicode_ci",
    });
    conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();
    await pool.end();
    return { ok: true, message: "اتصال موفق بود" };
  } catch (err) {
    try {
      conn?.release();
    } catch {
      /* ignore */
    }
    const e = err as NodeJS.ErrnoException & { code?: string; sqlMessage?: string };
    if (e.code === "ER_ACCESS_DENIED_ERROR") {
      return { ok: false, message: `دسترسی رد شد: کاربر '${cfg.user}' اجازه اتصال ندارد (Access denied)` };
    }
    if (e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT" || e.code === "ENOTFOUND") {
      return { ok: false, message: `سرور در ${cfg.host}:${cfg.port} در دسترس نیست` };
    }
    return { ok: false, message: e.sqlMessage || e.message || "خطای ناشناخته" };
  }
}

import { promises as fs } from "fs";
import path from "path";
import type { DbConfig } from "@/lib/mysql-types";

export interface DbSettings extends DbConfig {
  metaName: string;
  dataName: string;
}

export interface SmsSettings {
  apiKey: string;
  lineNumber: string;
}

export interface AppSettings {
  db: DbSettings;
  sms: SmsSettings;
  updatedAt: string;
}

const SETTINGS_PATH = path.join(process.cwd(), "data", "app-settings.json");

function defaults(): AppSettings {
  return {
    db: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      metaName: process.env.DB_META_NAME || "vira_forms",
      dataName: process.env.DB_DATA_NAME || "Forms",
    },
    sms: {
      apiKey: process.env.SMS_API_KEY || "",
      lineNumber: process.env.SMS_LINE_NUMBER || "",
    },
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeDb(input: Partial<DbSettings>): DbSettings {
  const d = defaults().db;
  const port = Number(input.port);
  return {
    host: String(input.host || d.host).trim() || d.host,
    port: Number.isFinite(port) && port > 0 && port <= 65535 ? Math.trunc(port) : d.port,
    user: String(input.user ?? d.user),
    password: String(input.password ?? d.password),
    metaName: String(input.metaName || d.metaName).trim() || d.metaName,
    dataName: String(input.dataName || d.dataName).trim() || d.dataName,
  };
}

function sanitizeSms(input: Partial<SmsSettings>): SmsSettings {
  const d = defaults().sms;
  return {
    apiKey: String(input.apiKey ?? d.apiKey).trim(),
    lineNumber: String(input.lineNumber ?? d.lineNumber).trim(),
  };
}

export async function getSettings(): Promise<AppSettings> {
  const d = defaults();
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      db: sanitizeDb({ ...d.db, ...(parsed.db || {}) }),
      sms: sanitizeSms({ ...d.sms, ...(parsed.sms || {}) }),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : d.updatedAt,
    };
  } catch {
    return d;
  }
}

export async function saveSettings(input: { db?: Partial<DbSettings>; sms?: Partial<SmsSettings> }): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    db: input.db ? sanitizeDb({ ...current.db, ...input.db }) : current.db,
    sms: input.sms ? sanitizeSms({ ...current.sms, ...input.sms }) : current.sms,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  const { invalidatePool } = await import("@/lib/mysql");
  await invalidatePool();
  return next;
}

export async function settingsExist(): Promise<boolean> {
  try {
    await fs.access(SETTINGS_PATH);
    return true;
  } catch {
    return false;
  }
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, Database, Loader2, MessageSquare, PlugZap, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

interface SettingsState {
  db: { host: string; port: number; user: string; password: string; metaName: string; dataName: string };
  sms: { apiKey: string; lineNumber: string };
}

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [settings, setSettings] = React.useState<SettingsState | null>(null);
  const [configured, setConfigured] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<"db" | "sms" | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error("خطا در دریافت تنظیمات");
        if (alive) {
          setSettings({ db: data.settings.db, sms: data.settings.sms });
          setConfigured(!!data.configured);
        }
      } catch (e) {
        if (alive) addToast({ message: (e as Error).message, variant: "error" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  const setDb = (patch: Partial<SettingsState["db"]>) => {
    setSettings((s) => (s ? { ...s, db: { ...s.db, ...patch } } : s));
    setTestResult(null);
  };
  const setSms = (patch: Partial<SettingsState["sms"]>) =>
    setSettings((s) => (s ? { ...s, sms: { ...s.sms, ...patch } } : s));

  const save = async (section: "db" | "sms") => {
    if (!settings) return;
    setSaving(section);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section === "db" ? { db: settings.db } : { sms: settings.sms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ذخیره ناموفق بود");
      setSettings({ db: data.settings.db, sms: data.settings.sms });
      setConfigured(true);
      addToast({ message: "تنظیمات ذخیره شد", variant: "success", title: "ذخیره شد" });
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error", title: "خطا" });
    } finally {
      setSaving(null);
    }
  };

  const test = async () => {
    if (!settings) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.db),
      });
      const data = await res.json();
      setTestResult({ ok: !!data.ok, message: data.message || "" });
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="بازگشت"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
            <h1 className="text-sm font-bold text-foreground">تنظیمات</h1>
          </div>
          {configured ? (
            <Badge variant="success">پیکربندی ذخیره شده</Badge>
          ) : (
            <Badge variant="warning">پیش‌فرض (ذخیره نشده)</Badge>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {loading || !settings ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                <Database className="h-4.5 w-4.5 text-primary" />
                اتصال دیتابیس (MySQL)
              </h2>
              <p className="mb-5 text-xs leading-5 text-muted-foreground">
                این مشخصات در فایل <span dir="ltr" className="font-mono">data/app-settings.json</span> روی همین سرور ذخیره می‌شود و در گیت منتشر نمی‌شود.
              </p>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="s-host">هاست</Label>
                  <Input id="s-host" dir="ltr" className="mt-1.5 font-mono text-xs" value={settings.db.host} onChange={(e) => setDb({ host: e.target.value })} placeholder="127.0.0.1" />
                </div>
                <div>
                  <Label htmlFor="s-port">پورت</Label>
                  <Input id="s-port" dir="ltr" type="number" className="mt-1.5 font-mono text-xs" value={settings.db.port} onChange={(e) => setDb({ port: Number(e.target.value) })} placeholder="3306" />
                </div>
                <div>
                  <Label htmlFor="s-user">نام کاربری</Label>
                  <Input id="s-user" dir="ltr" className="mt-1.5 font-mono text-xs" value={settings.db.user} onChange={(e) => setDb({ user: e.target.value })} placeholder="root" />
                </div>
                <div>
                  <Label htmlFor="s-pass">رمز عبور</Label>
                  <Input id="s-pass" dir="ltr" type="password" className="mt-1.5 font-mono text-xs" value={settings.db.password} onChange={(e) => setDb({ password: e.target.value })} placeholder="—" autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="s-meta">دیتابیس تعریف فرم‌ها</Label>
                  <Input id="s-meta" dir="ltr" className="mt-1.5 font-mono text-xs" value={settings.db.metaName} onChange={(e) => setDb({ metaName: e.target.value })} placeholder="vira_forms" />
                </div>
                <div>
                  <Label htmlFor="s-data">دیتابیس جدول پاسخ‌ها</Label>
                  <Input id="s-data" dir="ltr" className="mt-1.5 font-mono text-xs" value={settings.db.dataName} onChange={(e) => setDb({ dataName: e.target.value })} placeholder="Forms" />
                </div>
              </div>

              {testResult && (
                <div
                  role="status"
                  className={`mt-4 flex items-start gap-2 rounded-xl border p-3.5 text-xs leading-6 ${
                    testResult.ok
                      ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/8 text-rose-300"
                  }`}
                >
                  {testResult.ok ? <Check className="mt-1 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-1 h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={test} loading={testing} className="gap-2">
                  {!testing && <PlugZap className="h-4 w-4" />}
                  تست اتصال
                </Button>
                <Button onClick={() => save("db")} loading={saving === "db"} className="gap-2">
                  {saving !== "db" && <Save className="h-4 w-4" />}
                  ذخیره اتصال
                </Button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                پیامک پیش‌فرض (SMS.ir)
              </h2>
              <p className="mb-5 text-xs leading-5 text-muted-foreground">
                اگر در تنظیمات یک فرم کلید یا خط مشخص نشده باشد، این مقادیر در خروجی PHP استفاده می‌شوند.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="s-key">کلید API</Label>
                  <Input id="s-key" dir="ltr" type="password" className="mt-1.5 font-mono text-xs" value={settings.sms.apiKey} onChange={(e) => setSms({ apiKey: e.target.value })} placeholder="X-API-KEY" autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="s-line">شماره خط</Label>
                  <Input id="s-line" dir="ltr" className="mt-1.5 font-mono text-xs" value={settings.sms.lineNumber} onChange={(e) => setSms({ lineNumber: e.target.value })} placeholder="3000..." />
                </div>
              </div>
              <div className="mt-5">
                <Button onClick={() => save("sms")} loading={saving === "sms"} className="gap-2">
                  {saving !== "sms" && <Save className="h-4 w-4" />}
                  ذخیره پیامک
                </Button>
              </div>
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
}

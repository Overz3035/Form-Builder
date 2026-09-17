"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Database,
  FileText,
  Inbox,
  LayoutTemplate,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Rocket,
  Send,
  Settings2,
  Sun,
  Trash2,
  TriangleAlert,
  Users,
  Copy,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn, formatPersianDate, slugifyLatin } from "@/lib/utils";
import { useDbHealth } from "@/lib/use-db-health";
import { TemplatesDialog } from "@/components/dashboard/templates-dialog";
import type { FormSchema } from "@/types";

const STATUS: Record<FormSchema["status"], { label: string; variant: "success" | "warning" | "neutral" }> = {
  draft: { label: "پیش‌نویس", variant: "warning" },
  published: { label: "منتشر شده", variant: "success" },
  archived: { label: "آرشیو", variant: "neutral" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();
  const dbHealth = useDbHealth();

  const [forms, setForms] = React.useState<FormSchema[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({ totalForms: 0, published: 0, drafts: 0, submissions: 0 });

  const [createOpen, setCreateOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<FormSchema | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [formsRes, statsRes] = await Promise.all([
        fetch("/api/forms", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
      ]);
      const formsData = await formsRes.json();
      const statsData = await statsRes.json().catch(() => null);
      if (!formsRes.ok) throw new Error(formsData.error || "خطا در دریافت فرم‌ها");
      setForms(formsData.forms || []);
      if (statsData) setStats(statsData);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (alive) await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const createForm = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName || "فرم جدید" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ساخت فرم");
      addToast({ message: "فرم جدید ساخته شد", variant: "success" });
      router.push(`/forms/${data.form.id}`);
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error", title: "خطا" });
    } finally {
      setCreating(false);
    }
  };

  const duplicate = async (form: FormSchema) => {
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${form.name} (کپی)`, slug: `${form.slug}-copy` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const copy: FormSchema = {
        ...structuredClone(form),
        id: data.form.id,
        name: `${form.name} (کپی)`,
        slug: `${form.slug}-copy`,
        status: "draft",
        table: "",
        publishedAt: null,
      };
      await fetch(`/api/forms/${copy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: copy }),
      });
      setForms((prev) => [copy, ...prev]);
      addToast({ message: "فرم تکثیر شد", variant: "success" });
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error" });
    }
  };

  const publish = async (form: FormSchema) => {
    try {
      const res = await fetch(`/api/forms/${form.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error + (data.hint ? ` — ${data.hint}` : ""));
      setForms((prev) => prev.map((f) => (f.id === form.id ? data.form || { ...f, status: "published" } : f)));
      addToast({ message: "فرم منتشر شد و جدول پاسخ‌ها ساخته شد", variant: "success", title: "منتشر شد" });
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error", title: "خطای انتشار", duration: 8000 });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/forms/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("حذف ناموفق بود");
      setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      addToast({ message: "فرم حذف شد", variant: "warning", title: "حذف شد" });
      setDeleteTarget(null);
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const statsCards = [
    { label: "کل فرم‌ها", value: stats.totalForms, icon: <FileText className="h-4.5 w-4.5" />, color: "text-primary" },
    { label: "منتشر شده", value: stats.published, icon: <Rocket className="h-4.5 w-4.5" />, color: "text-emerald-400" },
    { label: "پیش‌نویس", value: stats.drafts, icon: <Pencil className="h-4.5 w-4.5" />, color: "text-amber-400" },
    { label: "پاسخ‌های ثبت‌شده", value: stats.submissions, icon: <Users className="h-4.5 w-4.5" />, color: "text-cyan-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <span className="text-base font-extrabold">V</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">Vira Forms</h1>
              <p className="text-[11px] text-muted-foreground">فرمساز مبتنی بر MySQL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dbHealth.ok === false && (
              <Tooltip content={dbHealth.hint || dbHealth.message}>
                <span className="flex cursor-help items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  اتصال دیتابیس
                </span>
              </Tooltip>
            )}
            {dbHealth.ok === true && (
              <Tooltip content="اتصال MySQL برقرار است">
                <span className="flex cursor-help items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
                  <Database className="h-3.5 w-3.5" />
                  متصل
                </span>
              </Tooltip>
            )}
            <Tooltip content="تنظیمات اتصال و پیامک">
              <button
                onClick={() => router.push("/settings")}
                aria-label="تنظیمات"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings2 className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
            <Tooltip content={theme === "dark" ? "تم روشن" : "تم تیره"}>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="تغییر تم"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            </Tooltip>
            <Button variant="outline" onClick={() => setTemplatesOpen(true)} className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              قالب‌ها
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              فرم جدید
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statsCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
              className="glass rounded-2xl p-5"
            >
              <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]", card.color)}>
                {card.icon}
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground">
                {loading ? "—" : card.value.toLocaleString("fa-IR")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mb-5 mt-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">فرم‌های من</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "در حال بارگذاری..." : `${forms.length.toLocaleString("fa-IR")} فرم`}
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-8 text-center">
            <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-rose-400" />
            <p className="font-semibold text-foreground">{loadError}</p>
            {loadError.includes("Access denied") && (
              <p dir="ltr" className="mt-3 rounded-lg bg-black/40 p-3 text-left font-mono text-[11px] leading-5 text-muted-foreground">
                CREATE USER IF NOT EXISTS &apos;root&apos;@&apos;%&apos; IDENTIFIED BY &apos;&apos;;
                <br />
                GRANT ALL PRIVILEGES ON *.* TO &apos;root&apos;@&apos;%&apos;;
                <br />
                FLUSH PRIVILEGES;
              </p>
            )}
            <Button variant="outline" size="sm" onClick={load} className="mt-4">
              تلاش مجدد
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-20 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary glow-primary">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">هنوز فرمی نساخته‌اید</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
              اولین فرم خود را بسازید، آن را منتشر کنید و پاسخ‌ها را مستقیم در MySQL بگیرید.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="mt-5 gap-2">
              <Plus className="h-4 w-4" />
              ساخت اولین فرم
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {forms.map((form, idx) => (
                <motion.article
                  key={form.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.3, ease: "easeOut" }}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold tracking-tight text-foreground">{form.name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                        {form.description || "بدون توضیحات"}
                      </p>
                    </div>
                    <Menu>
                      <MenuTrigger
                        className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <circle cx="12" cy="5" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="12" cy="19" r="1.6" />
                        </svg>
                      </MenuTrigger>
                      <MenuContent align="end">
                        <MenuItem onSelect={() => router.push(`/forms/${form.id}`)}>
                          <Pencil className="h-4 w-4" />
                          ویرایش
                        </MenuItem>
                        {form.status === "published" && (
                          <MenuItem onSelect={() => router.push(`/f/${form.slug}`)}>
                            <ExternalLink className="h-4 w-4" />
                            مشاهده فرم
                          </MenuItem>
                        )}
                        <MenuItem onSelect={() => router.push(`/forms/${form.id}/submissions`)}>
                          <Send className="h-4 w-4" />
                          پاسخ‌ها
                        </MenuItem>
                        <MenuItem onSelect={() => duplicate(form)}>
                          <Copy className="h-4 w-4" />
                          تکثیر
                        </MenuItem>
                        {form.status !== "published" && (
                          <>
                            <MenuSeparator />
                            <MenuItem onSelect={() => publish(form)}>
                              <Rocket className="h-4 w-4" />
                              انتشار
                            </MenuItem>
                          </>
                        )}
                        <MenuSeparator />
                        <MenuItem destructive onSelect={() => setDeleteTarget(form)}>
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS[form.status].variant}>{STATUS[form.status].label}</Badge>
                    <Badge variant="neutral">{form.fields.length.toLocaleString("fa-IR")} فیلد</Badge>
                    {form.sms.enabled && (
                      <Badge variant="info">
                        <MessageSquare className="h-3 w-3" />
                        پیامک
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <p className="text-[11px] text-muted-foreground">{formatPersianDate(form.updatedAt)}</p>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/forms/${form.id}/submissions`)}>
                        پاسخ‌ها
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/forms/${form.id}`)} className="gap-1.5">
                        <Pencil className="h-3 w-3" />
                        ویرایش
                      </Button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen} label="ساخت فرم جدید">        <DialogHeader title="فرم جدید" description="نام فرم به‌عنوان پیشنهاد نام جدول پاسخ‌ها استفاده می‌شود." />
        <DialogBody>
          <label htmlFor="new-form-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            نام فرم
          </label>
          <Input
            id="new-form-name"
            data-autofocus
            placeholder="مثلاً: فرم ثبت‌نام همایش"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && createForm()}
          />
          {newName.trim() && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              جدول پیشنهادی: <span dir="ltr" className="font-mono text-primary">form_{slugifyLatin(newName)}</span>
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={createForm} loading={creating}>
            ساخت و شروع طراحی
          </Button>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            انصراف
          </Button>
        </DialogFooter>
      </Dialog>

      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onCreated={(formId) => router.push(`/forms/${formId}`)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} label="حذف فرم">
        <DialogHeader title="حذف فرم" />
        <DialogBody>
          <p className="text-sm leading-7 text-foreground">
            فرم <span className="font-bold">{deleteTarget?.name}</span> حذف شود؟
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            تعریف فرم از دیتابیس حذف می‌شود. جدول پاسخ‌های ثبت‌شده در دیتابیس «Forms» دست‌نخورده باقی می‌ماند.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="destructive" onClick={confirmDelete} loading={deleting} className="gap-2">
            {!deleting && <Trash2 className="h-4 w-4" />}
            حذف قطعی
          </Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            انصراف
          </Button>
        </DialogFooter>
      </Dialog>

      {loading && (
        <div className="pointer-events-none fixed bottom-5 left-5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

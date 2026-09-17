"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Download, Inbox, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatPersianDateTime } from "@/lib/utils";
import { formatJalaliDate } from "@/lib/jalali";
import { resolveColumns } from "@/lib/generator/columns";
import type { FormSchema } from "@/types";

function displayCellValue(fieldType: string, raw: string | number | null | undefined): string {
  const s = raw === null || raw === undefined ? "" : String(raw);
  if (!s) return "";
  if (fieldType === "date" && /^\d{4}-\d{2}-\d{2}$/.test(s)) return formatJalaliDate(s);
  return s;
}

interface SubmissionRow {
  id: number;
  submittedAt: string;
  ip: string | null;
  data: Record<string, string | number | null>;
}

export default function SubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = String(params.id || "");

  const [form, setForm] = React.useState<FormSchema | null>(null);
  const [rows, setRows] = React.useState<SubmissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SubmissionRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const columns = React.useMemo(() => (form ? resolveColumns(form) : []), [form]);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const formRes = await fetch(`/api/forms/${id}`, { cache: "no-store" });
      const formData = await formRes.json();
      if (!formRes.ok) throw new Error(formData.error || "خطا در دریافت فرم");
      setForm(formData.form);
      const table = formData.form?.table;
      if (!table) {
        setRows([]);
        setLoading(false);
        return;
      }
      const subRes = await fetch(`/api/forms/${id}/submissions?table=${encodeURIComponent(table)}`, { cache: "no-store" });
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || "خطا در دریافت پاسخ‌ها");
      setRows(subData.submissions || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const exportCsv = () => {
    if (!form || rows.length === 0) return;
    const headers = ["شناسه", ...columns.map((c) => c.field.label), "زمان ثبت", "IP"];
    const lines = [headers];
    rows.forEach((r) => {
      lines.push([
        String(r.id),
        ...columns.map((c) => displayCellValue(c.field.type, r.data[c.name])),
        r.submittedAt,
        r.ip || "",
      ]);
    });
    const csv =
      "\uFEFF" +
      lines
        .map((line) => line.map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.table || form.slug}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ message: "خروجی CSV دانلود شد", variant: "success" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !form) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/forms/${form.id}/submissions?table=${encodeURIComponent(form.table)}&submissionId=${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حذف ناموفق بود");
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      addToast({ message: "پاسخ حذف شد", variant: "warning" });
      setDeleteTarget(null);
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="بازگشت"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-foreground">پاسخ‌های {form?.name || "..."}</h1>
              {form?.table && (
                <p dir="ltr" className="text-right font-mono text-[11px] text-muted-foreground">
                  Forms.{form.table}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
              <RefreshCcw className="h-3.5 w-3.5" />
              بروزرسانی
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              خروجی CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-8 text-center text-sm text-rose-400">
            {error}
          </div>
        ) : !form?.table ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-8 text-center">
            <p className="font-semibold text-foreground">این فرم هنوز منتشر نشده است</p>
            <p className="mt-2 text-sm text-muted-foreground">پس از انتشار، جدول پاسخ‌ها ساخته می‌شود.</p>
          </div>
        ) : rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-20 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-foreground">هنوز پاسخی ثبت نشده</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">پاسخ‌های جدید به‌محض ثبت اینجا نمایش داده می‌شوند.</p>
          </motion.div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-border bg-white/[0.03]">
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">#</th>
                    {columns.map((c) => (
                      <th key={c.name} className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                        {c.field.label}
                        <span dir="ltr" className="mr-1.5 font-mono text-[10px] font-normal text-muted-foreground/60">
                          {c.name}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">زمان ثبت</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">IP</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.id.toLocaleString("fa-IR")}</td>
                      {columns.map((c) => (
                        <td key={c.name} className="max-w-64 truncate px-4 py-3 text-foreground" title={displayCellValue(c.field.type, row.data[c.name])}>
                          {displayCellValue(c.field.type, row.data[c.name]) || "—"}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatPersianDateTime(row.submittedAt)}
                      </td>
                      <td dir="ltr" className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                        {row.ip || "—"}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => setDeleteTarget(row)}
                          aria-label="حذف پاسخ"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-white/[0.02] px-4 py-2.5">
              <Badge variant="neutral">{rows.length.toLocaleString("fa-IR")} پاسخ</Badge>
              <p className="text-[11px] text-muted-foreground">آخرین پاسخ: {formatPersianDateTime(rows[0]?.submittedAt || "")}</p>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} label="حذف پاسخ">
        <DialogHeader title="حذف پاسخ" />
        <DialogBody>
          <p className="text-sm leading-7 text-foreground">
            پاسخ شماره <span className="font-bold">{deleteTarget?.id.toLocaleString("fa-IR")}</span> از جدول حذف شود؟ این عمل قابل بازگشت نیست.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="destructive" onClick={confirmDelete} loading={deleting}>
            حذف
          </Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            انصراف
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Cloud,
  Database,
  Download,
  FlaskConical,
  Loader2,
  Moon,
  Pencil,
  Rocket,
  Smartphone,
  Sun,
  Tablet,
  TriangleAlert,
  Undo2,
  Redo2,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn, slugifyLatin } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder-store";
import { useDbHealth } from "@/lib/use-db-health";
import { generatePhp } from "@/lib/generator/php";
import { ComponentSidebar } from "./component-sidebar";
import { Canvas } from "./canvas";
import { PropertiesPanel } from "./properties-panel";
import { FormSettingsDialog } from "./form-settings-dialog";
import type { DeviceWidth } from "@/store/builder-store";
import type { FieldType } from "@/types";

function DeviceIcon({ device }: { device: DeviceWidth }) {
  if (device === "mobile") return <Smartphone className="h-4 w-4" />;
  if (device === "tablet") return <Tablet className="h-4 w-4" />;
  return <span className="block h-3.5 w-3.5 rounded-[3px] border-[1.5px] border-current" />;
}

export function BuilderLayout() {
  const router = useRouter();
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();
  const dbHealth = useDbHealth();
  const {
    form,
    isPreviewMode,
    device,
    saveState,
    selectedFieldId,
    undo,
    redo,
    historyIndex,
    history,
    loadForm: loadFormAction,
    setPreviewMode,
    setDevice,
    patchForm,
    addField,
    reorderField,
    duplicateField,
    removeField,
    selectField,
    markSaved,
  } = useBuilderStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeDragLabel, setActiveDragLabel] = React.useState<string | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [tableInput, setTableInput] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);
  const [publishDone, setPublishDone] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const savedRef = React.useRef(true);

  const canU = historyIndex > 0;
  const canR = historyIndex < history.length - 1;

  const openPublish = () => {
    if (!form) return;
    setTableInput(form.table || `form_${slugifyLatin(form.name)}`);
    setPublishDone(false);
    setPublishOpen(true);
  };

  // autosave (debounced)
  React.useEffect(() => {
    if (!form || !form.id) return;
    if (!useBuilderStore.getState().dirty) return;
    if (isPreviewMode && savedRef.current) return;
    savedRef.current = false;
    const t = window.setTimeout(async () => {
      useBuilderStore.getState().setSaveState("saving");
      try {
        const res = await fetch(`/api/forms/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "خطا در ذخیره");
        markSaved();
      } catch {
        useBuilderStore.getState().setSaveState("error");
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [form, markSaved, isPreviewMode]);

  // keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (form) {
          useBuilderStore.getState().setSaveState("saving");
          fetch(`/api/forms/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ form }),
          })
            .then((r) => {
              if (!r.ok) throw new Error();
              markSaved();
              addToast({ message: "تغییرات در دیتابیس ذخیره شد", variant: "success", title: "ذخیره شد" });
            })
            .catch(() =>
              addToast({ message: "ذخیره‌سازی ناموفق بود. اتصال دیتابیس را بررسی کنید.", variant: "error" })
            );
        }
        return;
      }
      if (typing) return;
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key.toLowerCase() === "d" && selectedFieldId) {
        e.preventDefault();
        duplicateField(selectedFieldId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedFieldId) {
        e.preventDefault();
        removeField(selectedFieldId);
      } else if (e.key === "Escape") {
        selectField(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [form, selectedFieldId, undo, redo, duplicateField, removeField, selectField, markSaved, addToast]);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { fieldType?: FieldType } | undefined;
    if (data?.fieldType) {
      const type = data.fieldType;
      setActiveDragLabel(type);
    } else {
      const f = form?.fields.find((x) => x.id === e.active.id);
      setActiveDragLabel(f?.label || "فیلد");
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragLabel(null);
    const { active, over } = e;
    if (!over) return;
    const data = active.data.current as { fieldType?: FieldType } | undefined;
    if (data?.fieldType) {
      const overIndex = form?.fields.findIndex((f) => f.id === over.id) ?? -1;
      addField(data.fieldType, overIndex === -1 ? undefined : overIndex + 1);
      return;
    }
    if (active.id !== over.id) {
      reorderField(String(active.id), String(over.id));
    }
  };

  const downloadPhp = async () => {
    if (!form) return;
    const payload = { ...form, table: tableInput || form.table };
    try {
      const res = await fetch(`/api/forms/${form.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: payload }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      URL.revokeObjectURL(url);
    } catch {
      const php = generatePhp(payload);
      const blob = new Blob([php], { type: "application/x-httpd-php" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      URL.revokeObjectURL(url);
    }
    addToast({ message: "فایل index.php دانلود شد. آن را در پوشه فرم روی سرور آپلود کنید.", variant: "success", title: "خروجی PHP" });
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.php";
    a.click();
  };

  const handlePublish = async () => {
    if (!form) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: { ...form, table: tableInput } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "انتشار ناموفق بود");
      if (data.form) {
        loadFormAction({
          ...form,
          table: data.form.table || tableInput,
          status: data.form.status || "published",
          publishedAt: data.form.publishedAt || new Date().toISOString(),
        });
      }
      setPublishDone(true);
      addToast({ message: "جدول پاسخ‌ها در دیتابیس آماده شد", variant: "success", title: "منتشر شد" });
    } catch (err) {
      const msg = (err as Error).message;
      const hint = (err as Error & { hint?: string }).hint;
      addToast({ message: hint ? `${msg} — ${hint}` : msg, variant: "error", title: "خطای انتشار", duration: 8000 });
    } finally {
      setPublishing(false);
    }
  };

  const saveIndicator = {
    idle: null,
    saving: (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        ذخیره...
      </span>
    ),
    saved: (
      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
        <Cloud className="h-3 w-3" />
        ذخیره شد
      </span>
    ),
    error: (
      <Tooltip content="اتصال دیتابیس را بررسی کنید">
        <span className="flex cursor-help items-center gap-1.5 text-[11px] text-rose-400">
          <TriangleAlert className="h-3 w-3" />
          خطای ذخیره
        </span>
      </Tooltip>
    ),
  }[saveState];

  if (!form) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip content="بازگشت به داشبورد" side="bottom">
              <button
                onClick={() => router.push("/dashboard")}
                aria-label="بازگشت به داشبورد"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
            {editingName ? (
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => patchForm({ name: e.target.value }, `name:${form.id}`)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="h-8 w-56"
                aria-label="نام فرم"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="group flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-secondary"
              >
                <span className="truncate text-sm font-semibold text-foreground">{form.name}</span>
                <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            {dbHealth.ok === false && (
              <Tooltip content={dbHealth.hint || dbHealth.message}>
                <span className="flex cursor-help items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400">
                  <TriangleAlert className="h-3 w-3" />
                  دیتابیس
                </span>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {saveIndicator}
            <div className="mx-1 h-5 w-px bg-border" />
            <Tooltip content="واگرد (Ctrl+Z)" side="bottom">
              <button
                onClick={undo}
                disabled={!canU}
                aria-label="واگرد"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="ازنو (Ctrl+Y)" side="bottom">
              <button
                onClick={redo}
                disabled={!canR}
                aria-label="ازنو"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </Tooltip>
            <div className="mx-1 h-5 w-px bg-border" />

            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5" role="radiogroup" aria-label="اندازه پیش‌نمایش">
              {(["desktop", "tablet", "mobile"] as DeviceWidth[]).map((d) => (
                <Tooltip key={d} side="bottom" content={d === "desktop" ? "دسکتاپ" : d === "tablet" ? "تبلت" : "موبایل"}>
                  <button
                    role="radio"
                    aria-checked={device === d}
                    onClick={() => setDevice(d)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      device === d ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <DeviceIcon device={d} />
                  </button>
                </Tooltip>
              ))}
            </div>

            <Button
              variant={isPreviewMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode(!isPreviewMode)}
              className="gap-1.5"
            >
              {isPreviewMode ? <Pencil className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
              {isPreviewMode ? "ویرایش" : "پیش‌نمایش"}
            </Button>

            <Tooltip content={theme === "dark" ? "تم روشن" : "تم تیره"} side="bottom">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="تغییر تم"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </Tooltip>

            <Tooltip content="تنظیمات فرم و پیامک" side="bottom">
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="تنظیمات فرم"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </Tooltip>

            <Button size="sm" onClick={openPublish} className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" />
              انتشار
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="w-64 shrink-0 border-l border-border">
            <ComponentSidebar />
          </div>
          <main className="min-w-0 flex-1">
            <Canvas />
          </main>
          <div className="hidden w-80 shrink-0 border-r border-border lg:block">
            <PropertiesPanel />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeDragLabel && (
          <div className="rounded-xl border border-primary/50 bg-popover/95 px-4 py-2.5 text-sm font-medium text-foreground shadow-2xl shadow-primary/20 backdrop-blur">
            {activeDragLabel}
          </div>
        )}
      </DragOverlay>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen} label="انتشار فرم">        <DialogHeader
          title="انتشار فرم"
          description="جدول پاسخ‌ها در MySQL ساخته می‌شود و خروجی PHP قابل آپلود تولید می‌گردد."
        />
        {publishDone ? (
          <>
            <DialogBody>
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">فرم منتشر شد</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      جدول پاسخ‌ها در دیتابیس «Forms» آماده است. حالا فایل PHP را دانلود و روی سرور آپلود کنید.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    جدول پاسخ‌ها
                  </p>
                  <p dir="ltr" className="font-mono text-sm text-primary">
                    Forms.{tableInput}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">مراحل آپلود</p>
                  <ol className="list-inside list-decimal space-y-1 text-xs leading-6 text-muted-foreground">
                    <li>فایل index.php را دانلود کنید.</li>
                    <li>روی سرور (مثلاً در public/html یا htdocs) پوشه‌ای مثل <span dir="ltr" className="font-mono">signupform</span> بسازید.</li>
                    <li>فایل را داخل آن پوشه آپلود کنید.</li>
                    <li>آدرس <span dir="ltr" className="font-mono">vira98.ir/signupform</span> بالا می‌آید.</li>
                  </ol>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={downloadPhp} className="gap-2">
                <Download className="h-4 w-4" />
                دانلود index.php
              </Button>
              <Button variant="ghost" onClick={() => setPublishOpen(false)}>
                بستن
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label htmlFor="table-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    نام جدول پاسخ‌ها (در دیتابیس Forms)
                  </label>
                  <Input
                    id="table-name"
                    dir="ltr"
                    value={tableInput}
                    onChange={(e) => setTableInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    className="font-mono text-sm"
                    data-autofocus
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    برگرفته از نام فرم: <span dir="ltr" className="font-mono">{`form_${slugifyLatin(form.name)}`}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white/[0.02] p-4 text-xs leading-6 text-muted-foreground">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                    <Database className="h-3.5 w-3.5" />
                    آنچه انجام می‌شود:
                  </p>
                  <p>• ساخت جدول <span dir="ltr" className="font-mono text-primary">{tableInput}</span> با ستون‌های هم‌نام فیلدها</p>
                  <p>• ثبت فرم با وضعیت «منتشر شده»</p>
                  <p>• آماده‌سازی خروجی PHP با تنظیمات پیامک {form.sms.enabled ? "(فعال)" : "(غیرفعال)"}</p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={handlePublish} loading={publishing} className="gap-2">
                {!publishing && <Rocket className="h-4 w-4" />}
                انتشار و ساخت جدول
              </Button>
              <Button variant="ghost" onClick={() => setPublishOpen(false)}>
                <X className="h-4 w-4" />
                انصراف
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
      <FormSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </DndContext>
  );
}

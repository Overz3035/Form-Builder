"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  LayoutTemplate,
  Lightbulb,
  Target,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { TEMPLATES } from "@/templates";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves,
  Lightbulb,
  Trophy,
  Target,
  Users,
  GraduationCap,
};

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (formId: string) => void;
}

export function TemplatesDialog({ open, onOpenChange, onCreated }: TemplatesDialogProps) {
  const { addToast } = useToast();
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const selected = TEMPLATES.find((t) => t.key === selectedKey) || null;

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedKey(null);
      setName("");
    }
    onOpenChange(o);
  };

  const pick = (key: string) => {
    setSelectedKey(key);
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl && !name) setName(tpl.name);
  };

  const create = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || selected.name, template: selected.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ساخت فرم از قالب");
      addToast({ message: `فرم «${data.form.name}» از قالب ساخته شد`, variant: "success" });
      onOpenChange(false);
      onCreated(data.form.id);
    } catch (e) {
      addToast({ message: (e as Error).message, variant: "error", title: "خطا" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} label="قالب‌های آماده" className="max-w-2xl">
      <DialogHeader
        title="قالب‌های آماده"
        description="یک قالب را انتخاب کنید؛ فرم کامل با همان فیلدها ساخته می‌شود و می‌توانید آن را ویرایش کنید."
      />
      <DialogBody>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((tpl, i) => {
            const Icon = ICONS[tpl.icon] || LayoutTemplate;
            const active = selectedKey === tpl.key;
            return (
              <motion.button
                key={tpl.key}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                onClick={() => pick(tpl.key)}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-right transition-all duration-200",
                  active
                    ? "border-primary/60 bg-primary/8 shadow-lg shadow-primary/10"
                    : "border-border bg-white/[0.02] hover:border-border-strong hover:bg-white/[0.04]"
                )}
              >
                <div
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-foreground">{tpl.name}</p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{tpl.description}</p>
              </motion.button>
            );
          })}
        </div>

        {selected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <label htmlFor="tpl-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              نام فرم جدید
            </label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !creating && create()}
              placeholder={selected.name}
            />
          </motion.div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button onClick={create} loading={creating} disabled={!selected} className="gap-2">
          {!creating && <ArrowLeft className="h-4 w-4" />}
          ساخت فرم از قالب
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          انصراف
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

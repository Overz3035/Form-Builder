"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_CATEGORIES, FIELD_DEFINITIONS } from "@/registry/field-registry";
import { useBuilderStore } from "@/store/builder-store";
import type { FieldType } from "@/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Type: Lucide.Type,
  Hash: Lucide.Hash,
  Mail: Lucide.Mail,
  Phone: Lucide.Phone,
  Lock: Lucide.Lock,
  Link: Lucide.Link,
  AlignRight: Lucide.AlignRight,
  ChevronDown: Lucide.ChevronDown,
  CircleDot: Lucide.CircleDot,
  SquareCheckBig: Lucide.SquareCheckBig,
  ToggleLeft: Lucide.ToggleLeft,
  Calendar: Lucide.Calendar,
  Clock: Lucide.Clock,
  FileUp: Lucide.FileUp,
  ImageUp: Lucide.ImageUp,
  Star: Lucide.Star,
  SlidersHorizontal: Lucide.SlidersHorizontal,
  Heading: Lucide.Heading,
  Minus: Lucide.Minus,
  MoveVertical: Lucide.MoveVertical,
};

function PaletteItem({ type, label, icon }: { type: FieldType; label: string; icon: string }) {
  const addField = useBuilderStore((s) => s.addField);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { fieldType: type },
  });
  const Icon = ICONS[icon] || Lucide.Circle;

  return (
    <motion.button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => addField(type)}
      className={cn(
        "flex w-full cursor-grab touch-none items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-sm transition-colors active:cursor-grabbing",
        "hover:border-border hover:bg-secondary",
        isDragging && "opacity-40"
      )}
      aria-label={`افزودن فیلد ${label}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate font-medium text-foreground">{label}</span>
    </motion.button>
  );
}

export function ComponentSidebar() {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim();
    if (!q) return FIELD_DEFINITIONS;
    return FIELD_DEFINITIONS.filter((f) => f.label.includes(q) || f.type.includes(q.toLowerCase()));
  }, [search]);

  return (
    <aside className="flex h-full flex-col bg-background" aria-label="فهرست کامپوننت‌ها">
      <div className="border-b border-border p-3.5">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">کامپوننت‌ها</h2>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="جستجوی فیلد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجوی فیلد"
            className="w-full rounded-lg border border-input bg-white/[0.03] py-2 pl-3 pr-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-3 scrollbar-slim">
        {FIELD_CATEGORIES.map((cat) => {
          const items = filtered.filter((f) => f.category === cat.key);
          if (items.length === 0) return null;
          return (
            <section key={cat.key}>
              <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {cat.label}
              </h3>
              <div className="space-y-0.5">
                {items.map((field) => (
                  <PaletteItem key={field.type} type={field.type} label={field.label} icon={field.icon} />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">نتیجه‌ای یافت نشد</p>
        )}
      </div>
      <div className="border-t border-border px-3.5 py-2.5 text-[11px] leading-5 text-muted-foreground/70">
        برای افزودن، روی آیتم کلیک کنید یا آن را به بوم بکشید.
      </div>
    </aside>
  );
}

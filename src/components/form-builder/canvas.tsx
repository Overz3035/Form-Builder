"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder-store";
import { FieldControl, type ControlValue } from "@/components/form-renderer/field-controls";
import { WIDTH_CLASS } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { FieldConfig } from "@/types";

function SortableField({ field, index }: { field: FieldConfig; index: number }) {
  const { selectedFieldId, selectField, removeField, duplicateField, updateField } = useBuilderStore();
  const isSelected = selectedFieldId === field.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const widthClass = WIDTH_CLASS[field.width] || "w-full";
  const isLayout = ["section", "divider", "spacer"].includes(field.type);
  const [previewValue, setPreviewValue] = React.useState<ControlValue>(
    field.type === "checkbox" ? [] : field.type === "toggle" ? false : ""
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(widthClass, isDragging && "relative z-10 opacity-50")}
    >
      <motion.div
        layout="position"
        onClick={() => selectField(field.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            selectField(field.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        className={cn(
          "group relative rounded-xl border-2 bg-card-solid/60 p-3.5 transition-colors duration-200",
          isSelected
            ? "border-primary/60 shadow-lg shadow-primary/10"
            : "border-transparent hover:border-border"
        )}
      >
        {isSelected && (
          <div className="absolute -right-2.5 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg border border-border-strong bg-popover p-1 shadow-xl">
            <Tooltip content="جابجایی">
              <button
                {...attributes}
                {...listeners}
                aria-label="جابجایی فیلد"
                className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="تکثیر">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateField(field.id);
                }}
                aria-label="تکثیر فیلد"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="حذف">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(field.id);
                }}
                aria-label="حذف فیلد"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        )}

        {field.type === "section" && (
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">{field.label}</h3>
            {field.description && <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>}
            <div className="mt-2.5 h-px bg-border" />
          </div>
        )}
        {field.type === "divider" && <div className="h-px bg-border" />}
        {field.type === "spacer" && (
          <div className="flex items-center justify-center rounded-lg bg-secondary/60 text-[11px] text-muted-foreground" style={{ height: field.config.height ?? 32 }}>
            فاصله ({field.config.height ?? 32}px)
          </div>
        )}

        {!isLayout && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                {field.label || "بدون برچسب"}
                {field.required && (
                  <span aria-hidden className="mr-1 text-rose-400">
                    *
                  </span>
                )}
              </label>
              {field.logic && field.logic.conditions.length > 0 && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                  شرطی
                </span>
              )}
              <span className="mr-auto text-[10px] text-muted-foreground/50">{field.id.slice(0, 12)}</span>
            </div>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <div className={cn(field.readOnly && "opacity-70")}>
              <FieldControl
                field={{ ...field, disabled: false, readOnly: false }}
                value={previewValue}
                onChange={(v) => {
                  setPreviewValue(v);
                  if (field.readOnly) updateField(field.id, { readOnly: true });
                }}
                compact
                disabled={false}
              />
            </div>
          </div>
        )}
      </motion.div>
      <span className="sr-only">{index + 1}</span>
    </div>
  );
}

export function Canvas() {
  const { form, isPreviewMode, device } = useBuilderStore();
  const fields = form?.fields || [];
  const deviceWidth = device === "mobile" ? "max-w-sm" : device === "tablet" ? "max-w-xl" : "max-w-3xl";

  if (isPreviewMode) {
    return (
      <div className="flex h-full flex-col items-center overflow-y-auto bg-background-subtle px-4 py-10 scrollbar-slim">
        <div className={cn("w-full", deviceWidth)}>
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{form?.name}</h2>
            {form?.description && <p className="mt-1.5 text-sm text-muted-foreground">{form.description}</p>}
          </div>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-x-4 gap-y-5">
              {fields.map((field, index) => (
                <SortableField key={field.id} field={field} index={index} />
              ))}
            </div>
          </SortableContext>
          {fields.length === 0 && <EmptyCanvas />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background-subtle px-4 py-6 scrollbar-slim">
      <div className={cn("mx-auto w-full", deviceWidth)}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap gap-x-4 gap-y-4">
            {fields.map((field, index) => (
              <SortableField key={field.id} field={field} index={index} />
            ))}
          </div>
        </SortableContext>
        {fields.length === 0 && <EmptyCanvas />}
        <div className="mt-4 h-24 rounded-xl border-2 border-dashed border-border/50" aria-hidden />
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 px-8 py-16 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary glow-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">اولین فیلد را اضافه کنید</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
        یک کامپوننت را از نوار کناری به اینجا بکشید، یا روی آن کلیک کنید تا به فرم اضافه شود.
      </p>
    </motion.div>
  );
}

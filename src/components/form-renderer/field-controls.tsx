"use client";

import * as React from "react";
import { File as FileIcon, Star, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import type { FieldConfig } from "@/types";

export type ControlValue = string | number | boolean | string[] | null;

interface FieldControlProps {
  field: FieldConfig;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  compact?: boolean;
}

function toList(value: ControlValue): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return value.split(",").filter(Boolean);
  return [];
}

function PhoneIcon() {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function FieldControl({ field, value, onChange, onBlur, disabled, invalid, id, compact }: FieldControlProps) {
  const common = {
    id,
    disabled: disabled || field.disabled,
    readOnly: field.readOnly,
    "aria-invalid": invalid || undefined,
  };

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          {...common}
          placeholder={field.placeholder || undefined}
          rows={compact ? 3 : 5}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );

    case "number":
    case "slider": {
      const min = field.config.min ?? (field.type === "slider" ? 0 : undefined);
      const max = field.config.max ?? (field.type === "slider" ? 100 : undefined);
      if (field.type === "slider") {
        const num = Number(value ?? min ?? 0);
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              {...common}
              min={min}
              max={max}
              step={field.config.step ?? 1}
              value={num}
              onChange={(e) => onChange(Number(e.target.value))}
              onBlur={onBlur}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--primary)]"
            />
            <span className="min-w-10 rounded-md bg-secondary px-2 py-1 text-center text-xs font-semibold text-foreground">
              {num}
            </span>
          </div>
        );
      }
      return (
        <Input
          {...common}
          type="number"
          inputMode="numeric"
          placeholder={field.placeholder || undefined}
          min={min}
          max={max}
          step={field.config.step ?? 1}
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={onBlur}
        />
      );
    }

    case "select": {
      if (field.config.multiple) {
        const list = toList(value);
        return (
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            {field.options.map((opt) => {
              const checked = list.includes(opt.value);
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border bg-white/[0.02] text-muted-foreground hover:border-border-strong"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={checked}
                    disabled={common.disabled}
                    onChange={(e) => {
                      const next = e.target.checked ? [...list, opt.value] : list.filter((v) => v !== opt.value);
                      onChange(next);
                    }}
                    onBlur={onBlur}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        );
      }
      return (
        <div className="relative">
          <select
            {...common}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={cn(
              "flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-white/[0.03] px-3.5 py-2 pl-9 text-sm text-foreground shadow-sm transition-colors",
              "hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25",
              invalid && "border-destructive/60",
              common.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <option value="" className="bg-card-solid">{field.placeholder || "انتخاب کنید..."}</option>
            {field.options.map((opt) => (
              <option key={opt.id} value={opt.value} className="bg-card-solid">
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      );
    }

    case "radio":
      return (
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")} role="radiogroup" aria-label={field.label}>
          {field.options.map((opt) => {
            const checked = typeof value === "string" && value === opt.value;
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-white/[0.02] text-muted-foreground hover:border-border-strong"
                )}
              >
                <input
                  type="radio"
                  name={id}
                  value={opt.value}
                  checked={checked}
                  disabled={common.disabled}
                  onChange={() => onChange(opt.value)}
                  onBlur={onBlur}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );

    case "checkbox": {
      const list = toList(value);
      return (
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
          {field.options.map((opt) => {
            const checked = list.includes(opt.value);
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-white/[0.02] text-muted-foreground hover:border-border-strong"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={checked}
                  disabled={common.disabled}
                  onChange={(e) => {
                    const next = e.target.checked ? [...list, opt.value] : list.filter((v) => v !== opt.value);
                    onChange(next);
                  }}
                  onBlur={onBlur}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }

    case "toggle":
      return (
        <Switch
          checked={value === true}
          onCheckedChange={(v) => onChange(v)}
          disabled={common.disabled}
          aria-label={field.label}
        />
      );

    case "rating": {
      const max = field.config.maxStars ?? 5;
      const num = Number(value ?? 0);
      return (
        <div className="flex items-center gap-1" role="radiogroup" aria-label={field.label}>
          {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
            <button
              key={star}
              type="button"
              disabled={common.disabled}
              aria-label={`${star} ستاره`}
              onClick={() => onChange(num === star ? 0 : star)}
              className="cursor-pointer rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  star <= num ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/50"
                )}
              />
            </button>
          ))}
          {num > 0 && <span className="mr-2 text-sm text-muted-foreground">{num} از {max}</span>}
        </div>
      );
    }

    case "file":
    case "image": {
      const fileName = typeof value === "string" && value ? value : null;
      return (
        <div className="space-y-2">
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-white/[0.02] px-4 text-center transition-colors",
              compact ? "py-5" : "py-8",
              "hover:border-primary/50 hover:bg-primary/[0.04]",
              common.disabled && "pointer-events-none opacity-50"
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {field.type === "image" ? "انتخاب تصویر" : "انتخاب فایل"}
            </span>
            <span className="text-xs text-muted-foreground">
              {field.type === "image" ? "JPG، PNG، SVG یا WEBP" : "یا فایل را اینجا رها کنید"}
              {field.config.maxSizeMB ? ` — حداکثر ${field.config.maxSizeMB}MB` : ""}
            </span>
            <input
              type="file"
              {...common}
              accept={field.type === "image" ? "image/*" : field.config.accept || undefined}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onChange(file ? file.name : "");
              }}
              onBlur={onBlur}
            />
          </label>
          {fileName && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-xs text-foreground">
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span dir="ltr" className="min-w-0 flex-1 truncate text-right font-mono text-[11px]">
                {fileName}
              </span>
              {!common.disabled && (
                <button
                  type="button"
                  aria-label="حذف فایل انتخاب‌شده"
                  onClick={() => onChange("")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    case "date":
      return (
        <JalaliDatePicker
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(iso) => onChange(iso)}
          disabled={common.disabled}
          invalid={invalid}
          placeholder={field.placeholder || undefined}
        />
      );

    case "time":
      return (
        <Input
          {...common}
          type="time"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );

    case "password":
      return (
        <Input
          {...common}
          type="password"
          placeholder={field.placeholder || undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
        />
      );

    case "phone":
      return (
        <div className="relative" dir="ltr">
          <Input
            {...common}
            type="tel"
            inputMode="tel"
            className="pl-12 text-left"
            placeholder={field.placeholder || "0912 345 6789"}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
          <PhoneIcon />
        </div>
      );

    default:
      return (
        <Input
          {...common}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          dir={field.type === "url" || field.type === "email" ? "ltr" : undefined}
          placeholder={field.placeholder || undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );
  }
}

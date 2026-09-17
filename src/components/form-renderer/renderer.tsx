"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldControl, type ControlValue } from "@/components/form-renderer/field-controls";
import { computeVisibility, type FieldValues } from "@/lib/logic";
import { WIDTH_CLASS } from "@/lib/utils";
import type { FieldConfig, FormSchema } from "@/types";

export function buildZodSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    const isArr = f.type === "checkbox" || (f.type === "select" && f.config.multiple);
    let base: z.ZodTypeAny = isArr ? z.array(z.string()) : z.string().or(z.number()).or(z.boolean());

    for (const rule of f.validation) {
      switch (rule.type) {
        case "min":
          if (typeof rule.value === "number") {
            base = isArr
              ? base.pipe(z.array(z.any()).min(1, rule.message))
              : base.pipe(z.coerce.number().min(rule.value, rule.message));
          }
          break;
        case "max":
          if (typeof rule.value === "number") {
            base = base.pipe(z.coerce.number().max(rule.value, rule.message));
          }
          break;
        case "minLength":
          if (typeof rule.value === "number") {
            base = base.pipe(z.string().min(rule.value, rule.message));
          }
          break;
        case "maxLength":
          if (typeof rule.value === "number") {
            base = base.pipe(z.string().max(rule.value, rule.message));
          }
          break;
        case "pattern":
          if (typeof rule.value === "string" && rule.value) {
            try {
              const re = new RegExp(rule.value);
              base = base.pipe(z.string().regex(re, rule.message));
            } catch {
              /* invalid pattern ignored */
            }
          }
          break;
        case "email":
          base = base.pipe(z.string().email(rule.message));
          break;
        case "phone":
          base = base.pipe(
            z.string().regex(/^(\+98|0098|98|0)?9\d{9}$/, rule.message || "شماره موبایل معتبر وارد کنید")
          );
          break;
        default:
          break;
      }
    }

    if (f.required) {
      base =
        isArr
          ? z.array(z.string()).min(1, `${f.label} را انتخاب کنید`)
          : f.type === "toggle"
            ? z.boolean().refine((v) => v === true, { message: `${f.label} الزامی است` })
            : z.any().refine((v) => v !== "" && v !== null && v !== undefined && !(v instanceof File ? false : String(v).trim() === ""), {
                message: `${f.label} الزامی است`,
              });
    }
    shape[f.id] = base;
  }
  return z.object(shape).passthrough();
}

export function defaultValuesFor(fields: FieldConfig[]): Record<string, ControlValue> {
  const values: Record<string, ControlValue> = {};
  for (const f of fields) {
    if (f.type === "checkbox" || (f.type === "select" && f.config.multiple)) {
      const dv = f.defaultValue;
      values[f.id] = typeof dv === "string" && dv ? dv.split(",") : [];
    } else if (f.type === "toggle") {
      values[f.id] = f.defaultValue === true || f.defaultValue === "true";
    } else if (f.type === "rating" || f.type === "slider" || f.type === "number") {
      values[f.id] = typeof f.defaultValue === "number" ? f.defaultValue : f.defaultValue ? Number(f.defaultValue) : 0;
    } else {
      values[f.id] = typeof f.defaultValue === "string" ? f.defaultValue : "";
    }
  }
  return values;
}

export interface FormRendererProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, ControlValue>) => Promise<void> | void;
  compact?: boolean;
  submitLabel?: string;
}

export function FormRenderer({ schema, onSubmit, compact, submitLabel }: FormRendererProps) {
  const fields = schema.fields;
  type Values = Record<string, ControlValue>;

  const form = useForm<Values>({
    // Only visible (logic-passing) fields are validated, so a required
    // field hidden by conditional logic never blocks submission.
    resolver: (async (values, context, options) => {
      const visible = computeVisibility(fields, values as FieldValues);
      const visibleSchema = buildZodSchema(fields.filter((f) => visible[f.id]));
      const inner = zodResolver(visibleSchema) as Resolver<Values>;
      return inner(values, context, options);
    }) as Resolver<Values>,
    defaultValues: defaultValuesFor(fields),
    mode: "onSubmit",
  });

  const watched = form.watch();
  const visible = computeVisibility(fields, watched as FieldValues);
  const shownFields = fields.filter((f) => visible[f.id]);
  const errors = form.formState.errors;
  const errorList = fields.filter((f) => visible[f.id] && errors[f.id]);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={compact ? "" : "mx-auto max-w-2xl"}>
      {Object.keys(errors).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/8 p-4"
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-400">
            <CircleAlert className="h-4 w-4" />
            لطفاً موارد زیر را اصلاح کنید:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {errorList.map((f) => (
              <li key={f.id}>
                <a
                  href={`#anchor-${f.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`anchor-${f.id}`)?.scrollIntoView({ behavior: "smooth" });
                    form.setFocus(f.id as never);
                  }}
                  className="underline-offset-2 hover:underline"
                >
                  {String(errors[f.id]?.message || f.label)}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit as never)} className="flex flex-wrap gap-x-4 gap-y-5" noValidate>
        {shownFields.map((field) => {
          return (
            <FieldBlock
              key={field.id}
              field={field}
              form={form}
              visible={visible}
              compact={compact}
            />
          );
        })}
        <div className="w-full pt-2">
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            {!submitting && <Send className="h-4 w-4" />}
            {submitLabel || schema.settings.submitText}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface FieldBlockProps {
  field: FieldConfig;
  form: ReturnType<typeof useForm<Record<string, ControlValue>>>;
  visible: Record<string, boolean>;
  compact?: boolean;
}

function FieldBlock({ field, form, visible, compact }: FieldBlockProps) {
  const error = form.formState.errors[field.id];
  const widthClass = WIDTH_CLASS[field.width] || "w-full";
  const value = form.watch(field.id as never) as ControlValue;

  if (field.type === "section") {
    return (
      <div className={`${widthClass} pt-4`}>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{field.label}</h3>
        {field.description && <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>}
        <div className="mt-3 h-px bg-border" />
      </div>
    );
  }
  if (field.type === "divider") {
    return <div className={`${widthClass} h-px bg-border`} />;
  }
  if (field.type === "spacer") {
    return <div className={widthClass} style={{ height: field.config.height ?? 32 }} aria-hidden />;
  }

  const inputId = `ctl-${field.id}`;
  const errorMessage = visible[field.id] && error ? String((error as { message?: string }).message || "") : "";

  return (
    <div id={`anchor-${field.id}`} className={widthClass}>
      <div className="space-y-2">
        {field.label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {field.label}
            {field.required && (
              <span aria-hidden className="mr-1 text-rose-400">
                *
              </span>
            )}
          </label>
        )}
        {field.description && <p className="text-xs leading-5 text-muted-foreground">{field.description}</p>}
        <FieldControl
          field={field}
          id={inputId}
          value={value}
          invalid={!!errorMessage}
          compact={compact}
          onChange={(v) => form.setValue(field.id, v as never, { shouldValidate: !!error })}
          onBlur={() => {
            form.setValue(field.id, value as never, { shouldValidate: true });
          }}
        />
        {errorMessage && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-400">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

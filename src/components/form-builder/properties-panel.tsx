"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2, X } from "lucide-react";
import { cn, translitFaToLatin, uid } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/store/builder-store";
import type { ConditionOperator, FieldConfig, FieldWidth, ValidationRule, ValidationType } from "@/types";

const TABS = [
  { key: "general", label: "عمومی" },
  { key: "config", label: "تنظیمات" },
  { key: "validation", label: "اعتبارسنجی" },
  { key: "logic", label: "منطق" },
  { key: "advanced", label: "پیشرفته" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const WIDTHS: FieldWidth[] = [25, 33, 50, 66, 75, 100];
const OPTION_TYPES = ["select", "radio", "checkbox"];
const TEXTUAL = ["text", "email", "phone", "password", "url", "textarea"];
const NUMERIC = ["number", "slider"];
const LAYOUT = ["section", "divider", "spacer"];

const RULE_TYPES: { type: ValidationType; label: string; needsValue: boolean; defaultMessage: string }[] = [
  { type: "minLength", label: "حداقل طول", needsValue: true, defaultMessage: "حداقل {v} کاراکتر وارد کنید" },
  { type: "maxLength", label: "حداکثر طول", needsValue: true, defaultMessage: "حداکثر {v} کاراکتر مجاز است" },
  { type: "min", label: "حداقل مقدار", needsValue: true, defaultMessage: "مقدار باید حداقل {v} باشد" },
  { type: "max", label: "حداکثر مقدار", needsValue: true, defaultMessage: "مقدار باید حداکثر {v} باشد" },
  { type: "pattern", label: "الگوی regex", needsValue: true, defaultMessage: "قالب وارد شده صحیح نیست" },
  { type: "email", label: "قالب ایمیل", needsValue: false, defaultMessage: "ایمیل معتبر وارد کنید" },
  { type: "phone", label: "قالب موبایل", needsValue: false, defaultMessage: "شماره موبایل معتبر وارد کنید" },
];

function rulesFor(field: FieldConfig): typeof RULE_TYPES {
  if (NUMERIC.includes(field.type)) return RULE_TYPES.filter((r) => ["min", "max"].includes(r.type));
  if (TEXTUAL.includes(field.type)) {
    const base = RULE_TYPES.filter((r) => ["minLength", "maxLength", "pattern"].includes(r.type));
    if (field.type === "email") return base;
    if (field.type === "phone") return base;
    return base;
  }
  return [];
}

export function PropertiesPanel() {
  const { form, selectedFieldId, selectField } = useBuilderStore();
  const [activeTab, setActiveTab] = React.useState<TabKey>("general");
  const field = form?.fields.find((f) => f.id === selectedFieldId);

  if (!field) {
    return (
      <aside className="flex h-full flex-col items-center justify-center bg-background p-8 text-center" aria-label="تنظیمات فیلد">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Settings2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">فیلدی انتخاب نشده</p>
        <p className="mt-1.5 max-w-52 text-xs leading-5 text-muted-foreground">
          روی یک فیلد در بوم کلیک کنید تا تنظیمات آن اینجا نمایش داده شود.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col bg-background" aria-label="تنظیمات فیلد">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{field.label}</p>
          <p className="text-[11px] text-muted-foreground">{field.type}</p>
        </div>
        <Tooltip content="بستن">
          <button
            onClick={() => selectField(null)}
            aria-label="بستن پنل تنظیمات"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="flex border-b border-border px-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative flex-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.span layoutId="props-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-slim">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "general" && <GeneralTab field={field} />}
            {activeTab === "config" && <ConfigTab field={field} />}
            {activeTab === "validation" && <ValidationTab field={field} />}
            {activeTab === "logic" && <LogicTab field={field} />}
            {activeTab === "advanced" && <AdvancedTab field={field} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}

function GeneralTab({ field }: { field: FieldConfig }) {
  const updateField = useBuilderStore((s) => s.updateField);
  const up = (key: keyof FieldConfig, value: unknown, coalesce?: string) =>
    updateField(field.id, { [key]: value } as Partial<FieldConfig>, coalesce);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="p-label">برچسب</Label>
        <Input
          id="p-label"
          className="mt-1.5"
          value={field.label}
          onChange={(e) => {
            const newLabel = e.target.value;
            const updates: Partial<FieldConfig> = { label: newLabel };
            if (field.column === translitFaToLatin(field.label)) {
              updates.column = translitFaToLatin(newLabel) || field.column;
            }
            updateField(field.id, updates, `label:${field.id}`);
          }}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          ستون دیتابیس این فیلد: <span dir="ltr" className="font-mono text-primary">{field.column}</span>
        </p>
      </div>
      <div>
        <Label htmlFor="p-desc">توضیح کمک‌کننده</Label>
        <Textarea id="p-desc" className="mt-1.5" rows={2} value={field.description || ""} onChange={(e) => up("description", e.target.value, `desc:${field.id}`)} />
      </div>
      {!LAYOUT.includes(field.type) && field.type !== "checkbox" && field.type !== "radio" && field.type !== "toggle" && (
        <div>
          <Label htmlFor="p-ph">متن راهنما (placeholder)</Label>
          <Input id="p-ph" className="mt-1.5" value={field.placeholder || ""} onChange={(e) => up("placeholder", e.target.value, `ph:${field.id}`)} />
        </div>
      )}
      {TEXTUAL.includes(field.type) && (
        <div>
          <Label htmlFor="p-def">مقدار پیش‌فرض</Label>
          <Input id="p-def" className="mt-1.5" value={String(field.defaultValue ?? "")} onChange={(e) => up("defaultValue", e.target.value, `dv:${field.id}`)} />
        </div>
      )}
    </div>
  );
}

function ConfigTab({ field }: { field: FieldConfig }) {
  const updateField = useBuilderStore((s) => s.updateField);

  if (LAYOUT.includes(field.type) && field.type !== "spacer") {
    return <p className="text-xs leading-6 text-muted-foreground">این نوع فیلد تنظیمات خاصی ندارد.</p>;
  }

  const setConfig = (patch: Partial<FieldConfig["config"]>) =>
    updateField(field.id, { config: { ...field.config, ...patch } });

  return (
    <div className="space-y-4">
      {field.type === "spacer" && (
        <div>
          <Label htmlFor="p-height">ارتفاع (پیکسل)</Label>
          <Input
            id="p-height"
            type="number"
            className="mt-1.5"
            value={field.config.height ?? 32}
            onChange={(e) => setConfig({ height: Number(e.target.value) || 32 })}
          />
        </div>
      )}

      {OPTION_TYPES.includes(field.type) && (
        <OptionsEditor field={field} />
      )}

      {field.type === "select" && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">انتخاب چندگانه</span>
          <Switch checked={!!field.config.multiple} onCheckedChange={(v) => setConfig({ multiple: v })} aria-label="انتخاب چندگانه" />
        </div>
      )}

      {NUMERIC.includes(field.type) && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-min">حداقل</Label>
            <Input id="p-min" type="number" className="mt-1.5" value={field.config.min ?? 0} onChange={(e) => setConfig({ min: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="p-max">حداکثر</Label>
            <Input id="p-max" type="number" className="mt-1.5" value={field.config.max ?? 100} onChange={(e) => setConfig({ max: Number(e.target.value) })} />
          </div>
          {field.type === "slider" && (
            <div className="col-span-2">
              <Label htmlFor="p-step">گام</Label>
              <Input id="p-step" type="number" className="mt-1.5" value={field.config.step ?? 1} onChange={(e) => setConfig({ step: Number(e.target.value) || 1 })} />
            </div>
          )}
        </div>
      )}

      {field.type === "rating" && (
        <div>
          <Label htmlFor="p-stars">تعداد ستاره</Label>
          <Input id="p-stars" type="number" min={3} max={10} className="mt-1.5" value={field.config.maxStars ?? 5} onChange={(e) => setConfig({ maxStars: Math.min(10, Math.max(3, Number(e.target.value) || 5)) })} />
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ field }: { field: FieldConfig }) {
  const updateField = useBuilderStore((s) => s.updateField);
  const options = field.options;

  const setOptions = (next: typeof options) => updateField(field.id, { options: next });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>گزینه‌ها ({options.length})</Label>
        <button
          onClick={() => setOptions([...options, { id: uid("o"), label: `گزینه ${options.length + 1}`, value: `option_${options.length + 1}` }])}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن
        </button>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.02] p-1.5">
            <div className="flex flex-col">
              <button
                aria-label="انتقال به بالا"
                disabled={i === 0}
                onClick={() => {
                  const next = [...options];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setOptions(next);
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                aria-label="انتقال به پایین"
                disabled={i === options.length - 1}
                onClick={() => {
                  const next = [...options];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  setOptions(next);
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <Input
              value={opt.label}
              aria-label="عنوان گزینه"
              className="h-8 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-1"
              onChange={(e) => {
                const next = options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o));
                setOptions(next);
              }}
            />
            <Input
              value={opt.value}
              dir="ltr"
              aria-label="مقدار گزینه"
              className="h-8 w-24 border-0 bg-transparent px-2 font-mono text-[11px] shadow-none focus-visible:ring-1"
              onChange={(e) => {
                const next = options.map((o) => (o.id === opt.id ? { ...o, value: e.target.value.replace(/\s+/g, "_") } : o));
                setOptions(next);
              }}
            />
            <button
              aria-label="حذف گزینه"
              onClick={() => setOptions(options.filter((o) => o.id !== opt.id))}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
            هنوز گزینه‌ای اضافه نشده است
          </p>
        )}
      </div>
    </div>
  );
}

function ValidationTab({ field }: { field: FieldConfig }) {
  const updateField = useBuilderStore((s) => s.updateField);
  const available = rulesFor(field);

  const setRules = (rules: ValidationRule[]) => updateField(field.id, { validation: rules });

  const addRule = (type: ValidationType) => {
    const def = RULE_TYPES.find((r) => r.type === type)!;
    setRules([...field.validation, { type, value: def.needsValue ? "" : undefined, message: def.defaultMessage.replace("{v}", "") }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">فیلد الزامی</p>
          <p className="text-[11px] text-muted-foreground">پاسخ دادن به این فیلد اجباری باشد</p>
        </div>
        <Switch checked={field.required} onCheckedChange={(v) => updateField(field.id, { required: v })} aria-label="الزامی بودن" />
      </div>

      {available.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {available
              .filter((r) => !field.validation.some((v) => v.type === r.type))
              .map((r) => (
                <button
                  key={r.type}
                  onClick={() => addRule(r.type)}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  {r.label}
                </button>
              ))}
          </div>
          <div className="space-y-2.5">
            {field.validation.map((rule, i) => {
              const def = RULE_TYPES.find((r) => r.type === rule.type);
              return (
                <motion.div
                  key={`${rule.type}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 rounded-lg border border-border bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{def?.label}</span>
                    <button
                      aria-label="حذف قانون"
                      onClick={() => setRules(field.validation.filter((_, j) => j !== i))}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {def?.needsValue && (
                    <Input
                      dir={rule.type === "pattern" ? "ltr" : undefined}
                      className="h-8 font-mono text-xs"
                      placeholder={rule.type === "pattern" ? "^[A-Za-z]+$" : "مقدار"}
                      value={String(rule.value ?? "")}
                      onChange={(e) =>
                        setRules(
                          field.validation.map((r, j) =>
                            j === i ? { ...r, value: rule.type === "pattern" ? e.target.value : Number(e.target.value) || 0 } : r
                          )
                        )
                      }
                    />
                  )}
                  <Input
                    className="h-8 text-xs"
                    placeholder="پیام خطا"
                    value={rule.message}
                    onChange={(e) => setRules(field.validation.map((r, j) => (j === i ? { ...r, message: e.target.value } : r)))}
                  />
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        !LAYOUT.includes(field.type) && (
          <p className="text-xs leading-6 text-muted-foreground">برای این نوع فیلد فقط «الزامی» قابل تنظیم است.</p>
        )
      )}
    </div>
  );
}

function LogicTab({ field }: { field: FieldConfig }) {
  const { form, updateField } = useBuilderStore();
  const otherFields = (form?.fields || []).filter(
    (f) => f.id !== field.id && !LAYOUT.includes(f.type) && !["file", "image", "password"].includes(f.type)
  );

  const logic = field.logic;
  const enabled = !!logic;

  const setLogic = (next: FieldConfig["logic"]) => updateField(field.id, { logic: next });

  const OPERATORS: { value: ConditionOperator; label: string }[] = [
    { value: "equals", label: "برابر باشد با" },
    { value: "notEquals", label: "برابر نباشد با" },
    { value: "contains", label: "شامل باشد" },
    { value: "notContains", label: "شامل نباشد" },
    { value: "empty", label: "خالی باشد" },
    { value: "notEmpty", label: "پر باشد" },
    { value: "gt", label: "بزرگ‌تر باشد از" },
    { value: "lt", label: "کوچک‌تر باشد از" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">نمایش شرطی</p>
          <p className="text-[11px] leading-5 text-muted-foreground">این فیلد فقط وقتی نمایش داده شود که شرایط برقرار باشد.</p>
        </div>
        <Switch
          checked={enabled}
          aria-label="فعال‌سازی نمایش شرطی"
          onCheckedChange={(v) =>
            setLogic(
              v
                ? { match: "all", conditions: [{ id: uid("c"), fieldId: otherFields[0]?.id || "", operator: "equals", value: "" }] }
                : null
            )
          }
        />
      </div>

      {enabled && logic && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="rounded-lg border border-border bg-white/[0.02] p-3">
            <p className="text-xs leading-6 text-muted-foreground">
              این فیلد <span className="font-semibold text-foreground">نمایش داده شود</span> اگر:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="تطبیق شرایط">
              {(["all", "any"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={logic.match === m}
                  onClick={() => setLogic({ ...logic, match: m })}
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1.5 text-xs transition-colors",
                    logic.match === m ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "all" ? "همه شرایط" : "هر یک از شرایط"}
                </button>
              ))}
            </div>
          </div>

          {logic.conditions.map((cond, i) => {
            const sourceField = otherFields.find((f) => f.id === cond.fieldId);
            const hasOptions = !!sourceField && ["select", "radio", "checkbox"].includes(sourceField.type);
            return (
              <div key={cond.id} className="space-y-2 rounded-lg border border-border bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">شرط {i + 1}</span>
                  <button
                    aria-label="حذف شرط"
                    onClick={() => setLogic({ ...logic, conditions: logic.conditions.filter((c) => c.id !== cond.id) })}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Select
                  aria-label="فیلد مبدأ شرط"
                  className="h-8 text-xs"
                  value={cond.fieldId}
                  onChange={(e) =>
                    setLogic({ ...logic, conditions: logic.conditions.map((c) => (c.id === cond.id ? { ...c, fieldId: e.target.value } : c)) })
                  }
                  options={otherFields.map((f) => ({ value: f.id, label: f.label }))}
                />
                <Select
                  aria-label="عملگر شرط"
                  className="h-8 text-xs"
                  value={cond.operator}
                  onChange={(e) =>
                    setLogic({
                      ...logic,
                      conditions: logic.conditions.map((c) => (c.id === cond.id ? { ...c, operator: e.target.value as ConditionOperator } : c)),
                    })
                  }
                  options={OPERATORS}
                />
                {!["empty", "notEmpty"].includes(cond.operator) && (
                  hasOptions ? (
                    <Select
                      aria-label="مقدار شرط"
                      className="h-8 text-xs"
                      value={cond.value || ""}
                      placeholder="یک مقدار انتخاب کنید"
                      onChange={(e) =>
                        setLogic({ ...logic, conditions: logic.conditions.map((c) => (c.id === cond.id ? { ...c, value: e.target.value } : c)) })
                      }
                      options={(sourceField?.options || []).map((o) => ({ value: o.value, label: o.label }))}
                    />
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      placeholder="مقدار"
                      value={cond.value || ""}
                      onChange={(e) =>
                        setLogic({ ...logic, conditions: logic.conditions.map((c) => (c.id === cond.id ? { ...c, value: e.target.value } : c)) })
                      }
                    />
                  )
                )}
              </div>
            );
          })}

          {otherFields.length > 0 && (
            <button
              onClick={() => setLogic({ ...logic, conditions: [...logic.conditions, { id: uid("c"), fieldId: otherFields[0].id, operator: "equals", value: "" }] })}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن شرط
            </button>
          )}
          {otherFields.length === 0 && (
            <p className="text-xs leading-6 text-muted-foreground">
              برای منطق شرطی ابتدا یک فیلد دیگر به فرم اضافه کنید.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

function AdvancedTab({ field }: { field: FieldConfig }) {
  const updateField = useBuilderStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div>
        <Label>عرض در فرم</Label>
        <div className="mt-1.5 grid grid-cols-6 gap-1" role="radiogroup" aria-label="عرض فیلد">
          {WIDTHS.map((w) => (
            <button
              key={w}
              role="radio"
              aria-checked={field.width === w}
              onClick={() => updateField(field.id, { width: w })}
              className={cn(
                "cursor-pointer rounded-md border py-1.5 text-[11px] font-medium transition-colors",
                field.width === w ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {w}٪
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="p-column">نام ستون در دیتابیس</Label>
        <Input
          id="p-column"
          dir="ltr"
          className="mt-1.5 font-mono text-xs"
          value={field.column}
          onChange={(e) => updateField(field.id, { column: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
        />
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          در جدول MySQL با همین نام ذخیره می‌شود. فقط حروف انگلیسی کوچک، عدد و ـ.
        </p>
      </div>

      <div className="space-y-2">
        {(
          [
            { key: "disabled" as const, label: "غیرفعال", desc: "کاربر نمی‌تواند مقدار را تغییر دهد" },
            { key: "readOnly" as const, label: "فقط خواندنی", desc: "مقدار قابل مشاهده است اما قابل ویرایش نیست" },
          ]
        ).map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-[11px] text-muted-foreground">{row.desc}</p>
            </div>
            <Switch checked={field[row.key]} onCheckedChange={(v) => updateField(field.id, { [row.key]: v })} aria-label={row.label} />
          </div>
        ))}
      </div>

      {field.type === "phone" && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/8 p-3">
          <p className="text-xs font-semibold text-cyan-400">فیلد پیامک</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            این فیلد به عنوان مقصد پیامک خوش‌آمد پس از ثبت فرم استفاده می‌شود (در تنظیمات فرم فعال کنید).
          </p>
        </div>
      )}

      <button
        onClick={() => {
          if (confirm(`فیلد «${field.label}» حذف شود؟`)) {
            useBuilderStore.getState().removeField(field.id);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف فیلد
      </button>
    </div>
  );
}

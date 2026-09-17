import type { FieldCategory, FieldConfig, FieldDefinition, FieldType } from "@/types";
import { translitFaToLatin, uid } from "@/lib/utils";

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  { type: "text", label: "متن کوتاه", category: "basic", icon: "Type", defaultConfig: { placeholder: "متن را وارد کنید..." } },
  { type: "number", label: "عدد", category: "basic", icon: "Hash", defaultConfig: { placeholder: "۰" } },
  { type: "email", label: "ایمیل", category: "basic", icon: "Mail", defaultConfig: { placeholder: "example@mail.com" } },
  { type: "phone", label: "شماره موبایل", category: "basic", icon: "Phone", defaultConfig: { placeholder: "۰۹۱۲۳۴۵۶۷۸۹" } },
  { type: "password", label: "رمز عبور", category: "basic", icon: "Lock", defaultConfig: { placeholder: "••••••••" } },
  { type: "url", label: "لینک", category: "basic", icon: "Link", defaultConfig: { placeholder: "https://..." } },
  { type: "textarea", label: "متن بلند", category: "basic", icon: "AlignRight", defaultConfig: { placeholder: "متن خود را وارد کنید..." } },
  { type: "select", label: "لیست کشویی", category: "selection", icon: "ChevronDown", defaultConfig: { options: [{ id: "o1", label: "گزینه اول", value: "option_1" }] } },
  { type: "radio", label: "تک‌انتخابی", category: "selection", icon: "CircleDot", defaultConfig: { options: [{ id: "o1", label: "گزینه اول", value: "option_1" }] } },
  { type: "checkbox", label: "چندانتخابی", category: "selection", icon: "SquareCheckBig", defaultConfig: { options: [{ id: "o1", label: "گزینه اول", value: "option_1" }] } },
  { type: "toggle", label: "کلید دوحالته", category: "selection", icon: "ToggleLeft", defaultConfig: {} },
  { type: "date", label: "تاریخ", category: "datetime", icon: "Calendar", defaultConfig: {} },
  { type: "time", label: "زمان", category: "datetime", icon: "Clock", defaultConfig: {} },
  { type: "file", label: "آپلود فایل", category: "advanced", icon: "FileUp", defaultConfig: { config: { maxSizeMB: 5 } } },
  { type: "image", label: "آپلود تصویر", category: "advanced", icon: "ImageUp", defaultConfig: { config: { accept: "image/*", maxSizeMB: 5 } } },
  { type: "rating", label: "امتیازدهی", category: "advanced", icon: "Star", defaultConfig: { config: { maxStars: 5 } } },
  { type: "slider", label: "اسلایدر", category: "advanced", icon: "SlidersHorizontal", defaultConfig: { config: { min: 0, max: 100, step: 1 } } },
  { type: "section", label: "سرتیتر بخش", category: "layout", icon: "Heading", defaultConfig: {} },
  { type: "divider", label: "خط جداکننده", category: "layout", icon: "Minus", defaultConfig: {} },
  { type: "spacer", label: "فاصله‌دهنده", category: "layout", icon: "MoveVertical", defaultConfig: { config: { height: 32 } } },
];

export const FIELD_CATEGORIES: { key: FieldCategory; label: string }[] = [
  { key: "basic", label: "پایه‌ای" },
  { key: "selection", label: "انتخاب" },
  { key: "datetime", label: "تاریخ و زمان" },
  { key: "advanced", label: "پیشرفته" },
  { key: "layout", label: "چیدمان" },
];

export const LAYOUT_TYPES: FieldType[] = ["section", "divider", "spacer"];
export const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];
export const TEXTUAL_TYPES: FieldType[] = ["text", "number", "email", "phone", "password", "url", "textarea"];
export const DB_VALUE_TYPES: FieldType[] = [
  "text", "number", "email", "phone", "password", "url", "textarea",
  "select", "radio", "checkbox", "toggle", "date", "time", "rating", "slider",
];

export function createDefaultField(type: FieldType, index: number): FieldConfig {
  const def = FIELD_DEFINITIONS.find((f) => f.type === type);
  const baseLabel = def?.label || type;
  return {
    id: uid("f"),
    type,
    label: baseLabel,
    description: "",
    placeholder: "",
    defaultValue: "",
    required: false,
    disabled: false,
    readOnly: false,
    width: 100,
    column: translitFaToLatin(baseLabel) || `col_${index + 1}`,
    validation: [],
    options: def?.defaultConfig?.options ? JSON.parse(JSON.stringify(def.defaultConfig.options)) : [],
    logic: null,
    config: { ...(def?.defaultConfig?.config || {}) },
  };
}

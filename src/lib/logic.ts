import type { Condition, FieldConfig, FieldLogic, Option } from "@/types";

export type FieldValues = Record<string, string | number | boolean | string[] | null>;

function getComparable(value: FieldValues[string]): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

export function checkCondition(condition: Condition, values: FieldValues): boolean {
  const raw = values[condition.fieldId];
  const str = getComparable(raw);
  const target = condition.value ?? "";
  const targetNum = Number(target);

  switch (condition.operator) {
    case "equals":
      return str === target;
    case "notEquals":
      return str !== target;
    case "contains":
      return str.includes(target);
    case "notContains":
      return !str.includes(target);
    case "empty":
      return str.trim() === "";
    case "notEmpty":
      return str.trim() !== "";
    case "gt":
      return Number(str) > targetNum;
    case "lt":
      return Number(str) < targetNum;
    default:
      return true;
  }
}

function isFieldVisible(field: FieldConfig, values: FieldValues): boolean {
  if (!field.logic) return true;
  const logic: FieldLogic = field.logic;
  if (!logic.conditions || logic.conditions.length === 0) return true;
  const results = logic.conditions.map((c) => checkCondition(c, values));
  return logic.match === "all" ? results.every(Boolean) : results.some(Boolean);
}

export function computeVisibility(fields: FieldConfig[], values: FieldValues): Record<string, boolean> {
  const visible: Record<string, boolean> = {};
  for (const field of fields) {
    visible[field.id] = isFieldVisible(field, values);
  }
  return visible;
}

export function conditionLabel(operator: Condition["operator"]): string {
  switch (operator) {
    case "equals":
      return "برابر باشد با";
    case "notEquals":
      return "برابر نباشد با";
    case "contains":
      return "شامل باشد";
    case "notContains":
      return "شامل نباشد";
    case "empty":
      return "خالی باشد";
    case "notEmpty":
      return "پر باشد";
    case "gt":
      return "بزرگ‌تر باشد از";
    case "lt":
      return "کوچک‌تر باشد از";
  }
}

export function findFieldLabel(fields: FieldConfig[], fieldId: string): string {
  return fields.find((f) => f.id === fieldId)?.label || "—";
}

export function optionValues(options: Option[]): { value: string; label: string }[] {
  return options.map((o) => ({ value: o.value, label: o.label }));
}

import type { FieldConfig, FormSchema } from "@/types";
import { DB_VALUE_TYPES } from "@/registry/field-registry";
import { sanitizeIdentifier } from "@/lib/utils";

export interface ResolvedColumn {
  field: FieldConfig;
  name: string;
  sqlType: string;
  phpType: "string" | "number" | "date" | "time" | "bool";
}

export function sqlTypeForField(field: FieldConfig): string {
  switch (field.type) {
    case "textarea":
      return "TEXT";
    case "number":
      return "DECIMAL(18,4)";
    case "checkbox":
      return field.config.multiple ? "TEXT" : "VARCHAR(255)";
    case "toggle":
      return "TINYINT(1)";
    case "date":
      return "DATE";
    case "time":
      return "TIME";
    case "rating":
      return "TINYINT UNSIGNED";
    case "slider":
      return "INT";
    default:
      return "VARCHAR(255)";
  }
}

function phpTypeFor(field: FieldConfig): ResolvedColumn["phpType"] {
  switch (field.type) {
    case "number":
    case "rating":
    case "slider":
      return "number";
    case "date":
      return "date";
    case "time":
      return "time";
    case "toggle":
      return "bool";
    default:
      return "string";
  }
}

export function resolveColumns(form: FormSchema): ResolvedColumn[] {
  const valueFields = form.fields.filter((f) => DB_VALUE_TYPES.includes(f.type));
  const seen = new Map<string, number>();
  return valueFields.map((field) => {
    let name = sanitizeIdentifier(field.column) || "col";
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name}_${count + 1}`;
    return { field, name, sqlType: sqlTypeForField(field), phpType: phpTypeFor(field) };
  });
}

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "password"
  | "url"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "toggle"
  | "date"
  | "time"
  | "file"
  | "image"
  | "rating"
  | "slider"
  | "section"
  | "divider"
  | "spacer";

export type FormStatus = "draft" | "published" | "archived";

export type FieldWidth = 25 | 33 | 50 | 66 | 75 | 100;

export interface Option {
  id: string;
  label: string;
  value: string;
}

export type ValidationType =
  | "required"
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "email"
  | "phone";

export interface ValidationRule {
  type: ValidationType;
  value?: string | number;
  message: string;
}

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "empty"
  | "notEmpty"
  | "gt"
  | "lt";

export interface Condition {
  id: string;
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

export interface FieldLogic {
  match: "all" | "any";
  conditions: Condition[];
}

export interface FieldConfig {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  width: FieldWidth;
  column: string;
  validation: ValidationRule[];
  options: Option[];
  logic: FieldLogic | null;
  config: {
    min?: number;
    max?: number;
    step?: number;
    multiple?: boolean;
    maxStars?: number;
    height?: number;
    accept?: string;
    maxSizeMB?: number;
  };
}

export interface SmsParameter {
  name: string;
  fieldId: string;
}

export interface SmsSettings {
  enabled: boolean;
  mode: "verify" | "bulk";
  templateId: string;
  parameters: SmsParameter[];
  message: string;
  apiKey: string;
  lineNumber: string;
}

export interface FormSettings {
  submitText: string;
  successMessage: string;
  theme: "dark" | "light";
}

export interface FormSchema {
  id: string;
  name: string;
  slug: string;
  table: string;
  description: string;
  status: FormStatus;
  publishedAt: string | null;
  fields: FieldConfig[];
  settings: FormSettings;
  sms: SmsSettings;
  createdAt: string;
  updatedAt: string;
}

export type FieldCategory = "basic" | "selection" | "datetime" | "advanced" | "layout";

export interface FieldDefinition {
  type: FieldType;
  label: string;
  category: FieldCategory;
  icon: string;
  defaultConfig: Partial<FieldConfig>;
}

export interface SubmissionRecord {
  id: number;
  formId: string;
  tableName: string;
  data: Record<string, string | number | null>;
  submittedAt: string;
  ip?: string;
}

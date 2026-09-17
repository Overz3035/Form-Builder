import type {
  ConditionOperator,
  FieldConfig,
  FieldType,
  FieldWidth,
  FormSettings,
  SmsSettings,
  ValidationRule,
} from "@/types";
import { uid } from "@/lib/utils";

export interface TemplateOption {
  label: string;
  value?: string;
}

export interface TemplateCondition {
  ref: string;
  operator: ConditionOperator;
  value?: string;
}

export interface TemplateLogic {
  match: "all" | "any";
  conditions: TemplateCondition[];
}

export interface FieldSpec {
  key: string;
  type: FieldType;
  label: string;
  required?: boolean;
  width?: FieldWidth;
  column?: string;
  placeholder?: string;
  description?: string;
  options?: TemplateOption[];
  validation?: ValidationRule[];
  logic?: TemplateLogic;
  config?: FieldConfig["config"];
}

export interface TemplateBuild {
  name: string;
  description: string;
  fields: FieldConfig[];
  settings: FormSettings;
  sms: SmsSettings;
}

export interface FormTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  build: () => TemplateBuild;
}

const defaultSms = (): SmsSettings => ({
  enabled: false,
  mode: "verify",
  templateId: "",
  parameters: [],
  message: "ثبت‌نام شما با موفقیت انجام شد.",
  apiKey: "",
  lineNumber: "",
});

const defaultSettings = (submitText: string, successMessage: string): FormSettings => ({
  submitText,
  successMessage,
  theme: "dark",
});

function materialize(specs: FieldSpec[]): FieldConfig[] {
  const ids = new Map<string, string>();
  specs.forEach((s) => ids.set(s.key, uid("f")));
  return specs.map((s) => ({
    id: ids.get(s.key)!,
    type: s.type,
    label: s.label,
    description: s.description || "",
    placeholder: s.placeholder || "",
    defaultValue: "",
    required: s.required ?? false,
    disabled: false,
    readOnly: false,
    width: s.width ?? 100,
    column: s.column || s.key,
    validation: s.validation || [],
    options: (s.options || []).map((o, i) => ({
      id: uid("o"),
      label: o.label,
      value: o.value ?? o.label,
    })),
    logic: s.logic
      ? {
          match: s.logic.match,
          conditions: s.logic.conditions.map((c) => ({
            id: uid("c"),
            fieldId: ids.get(c.ref) || "",
            operator: c.operator,
            value: c.value || "",
          })),
        }
      : null,
    config: { ...(s.config || {}) },
  }));
}

const TEN_DIGITS: ValidationRule = {
  type: "pattern",
  value: "^[0-9۰-۹]{10}$",
  message: "باید دقیقاً ۱۰ رقم باشد",
};

const yesNo = (key: string, label: string, required: boolean, logic?: TemplateLogic): FieldSpec => ({
  key,
  type: "radio",
  label,
  required,
  width: 100,
  column: key,
  options: [
    { label: "بله", value: "بله" },
    { label: "خیر", value: "خیر" },
  ],
  ...(logic ? { logic } : {}),
});

const genderField = (): FieldSpec => ({
  key: "gender",
  type: "radio",
  label: "جنسیت شرکت کننده",
  required: true,
  width: 100,
  column: "gender",
  options: [
    { label: "مرد", value: "مرد" },
    { label: "زن", value: "زن" },
  ],
});

const employeeSection = (): FieldSpec[] => [
  { key: "sec_employee", type: "section", label: "مشخصات فرد شاغل" },
  { key: "full_name", type: "text", label: "نام و نام خانوادگی فرد شاغل", required: true, column: "full_name", placeholder: "نام کامل را وارد کنید" },
  { key: "code_personeli", type: "text", label: "کد پرسنلی فرد شاغل", required: true, column: "code_personeli", placeholder: "فقط عدد" },
  { key: "vahed", type: "text", label: "واحد", required: true, column: "vahed" },
  { key: "telz", type: "phone", label: "شماره تماس فرد شاغل", required: true, column: "telz", placeholder: "09123456789" },
];

const participantBase = (extra: FieldSpec[] = []): FieldSpec[] => [
  { key: "sec_participant", type: "section", label: "مشخصات شرکت‌کننده" },
  { key: "nesbat", type: "text", label: "نسبت شرکت کننده با فرد شاغل", required: true, column: "nesbat", placeholder: "مثلاً: فرزند" },
  { key: "full_name_sherkatkonande", type: "text", label: "نام و نام خانوادگی شرکت کننده", required: true, column: "full_name_sherkatkonande" },
  { key: "code_meli_sherkatkonande", type: "text", label: "کد ملی شرکت کننده", required: true, column: "code_meli_sherkatkonande", placeholder: "۱۰ رقم", validation: [TEN_DIGITS] },
  { key: "tel_sherkatkonande", type: "phone", label: "شماره تماس شرکت کننده", required: true, column: "tel_sherkatkonande", placeholder: "09123456789" },
  { key: "tarikh_tavalod", type: "date", label: "تاریخ تولد شرکت کننده", required: true, column: "tarikh_tavalod" },
  genderField(),
  ...extra,
];

const OZV_LABEL = "آیا شرکت کننده عضو باشگاه می باشد؟";
const TAMAYOL_LABEL = "آیا شرکت کننده تمایل به عضویت در باشگاه دارد؟";

const ozvBlock = (): FieldSpec[] => [
  yesNo("ozv", OZV_LABEL, true),
  yesNo("tamayol", TAMAYOL_LABEL, false, {
    match: "all",
    conditions: [{ ref: "ozv", operator: "equals", value: "خیر" }],
  }),
];

function competitionBuild(title: string, submitText: string): TemplateBuild {
  return {
    name: title,
    description: "",
    fields: materialize([...employeeSection(), ...participantBase(), ...ozvBlock()]),
    settings: defaultSettings(submitText, "ثبت‌نام شما با موفقیت انجام شد. سپاس از همراهی شما."),
    sms: defaultSms(),
  };
}

export const TEMPLATES: FormTemplate[] = [
  {
    key: "bazdid-aquapark",
    name: "ثبت‌نام بازدید پارک آبی و آکواریوم",
    description: "نام، کد ملی، کد پرسنلی، واحد، نوع استخدام و شماره تماس",
    icon: "Waves",
    build: () => ({
      name: "فرم ثبت‌نام بازدید پروژه پارک آبی و آکواریوم",
      description: "سامانه ثبت نام بازدید پروژه پارک آبی و آکواریوم",
      fields: materialize([
        { key: "full_name", type: "text", label: "نام و نام خانوادگی", required: true, column: "full_name" },
        { key: "code_meli", type: "text", label: "کد ملی", required: true, column: "code_meli", placeholder: "۱۰ رقم", validation: [TEN_DIGITS] },
        { key: "code_personeli", type: "text", label: "کد پرسنلی", required: true, column: "code_personeli", placeholder: "فقط عدد" },
        { key: "vahed", type: "text", label: "واحد", required: true, column: "vahed" },
        { key: "noe_estekhdam", type: "text", label: "نوع استخدام", required: true, column: "noe_estekhdam" },
        { key: "telz", type: "phone", label: "شماره تماس", required: true, column: "telz", placeholder: "09123456789" },
      ]),
      settings: defaultSettings("ثبت نام", "ثبت‌نام شما با موفقیت انجام شد."),
      sms: defaultSms(),
    }),
  },
  {
    key: "idea",
    name: "فرم ثبت ایده",
    description: "مشخصات فردی، تحصیلات، وضعیت شغلی و شرح کامل ایده",
    icon: "Lightbulb",
    build: () => ({
      name: "فرم ثبت ایده",
      description: "",
      fields: materialize([
        { key: "full_name", type: "text", label: "نام و نام خانوادگی", required: true, column: "full_name" },
        { key: "code_meli", type: "text", label: "کد ملی", required: true, column: "code_meli", placeholder: "۱۰ رقم", validation: [TEN_DIGITS] },
        {
          key: "gender",
          type: "radio",
          label: "جنسیت",
          required: true,
          column: "gender",
          options: [
            { label: "مرد", value: "مرد" },
            { label: "زن", value: "زن" },
          ],
        },
        { key: "shahr_sokonat", type: "text", label: "شهر محل سکونت", required: true, column: "shahr_sokonat" },
        { key: "telz", type: "phone", label: "شماره تماس", required: true, column: "telz", placeholder: "09123456789" },
        {
          key: "tahsilat",
          type: "select",
          label: "تحصیلات",
          required: true,
          column: "tahsilat",
          options: [{ label: "زیر دیپلم" }, { label: "دیپلم" }, { label: "کاردانی" }, { label: "کارشناسی" }, { label: "کارشناسی ارشد" }, { label: "دکتری" }],
        },
        {
          key: "vaziatshoghli",
          type: "select",
          label: "وضعیت شغلی",
          required: true,
          column: "vaziatshoghli",
          options: [{ label: "دانش آموز" }, { label: "دانشجو" }, { label: "عضو هیئت علمی" }, { label: "کارمند" }, { label: "سایر" }],
        },
        { key: "ide_title", type: "textarea", label: "عنوان ایده", required: true, column: "ide_title" },
        { key: "ide_sharik", type: "textarea", label: "مشخصات همکاران ایده (همراه با درصد مشارکت و نوع همکاری)", required: true, column: "ide_sharik" },
        { key: "ide_kholase", type: "textarea", label: "توضیح مختصر ایده", required: true, column: "ide_kholase" },
        { key: "ide_karbord", type: "textarea", label: "ایده شما چه مشکلاتی را برطرف خواهد نمود؟", required: true, column: "ide_karbord" },
        { key: "ide_noavari", type: "textarea", label: "جنبه های نوآوری ایده", required: true, column: "ide_noavari" },
        { key: "ide_chalesh", type: "textarea", label: "بزرگترین چالش ایده شما", required: true, column: "ide_chalesh" },
        { key: "ide_tejari", type: "textarea", label: "آیا ایده قابل تجاری سازی است؟ (در این صورت چه حمایت هایی لازم است)", required: true, column: "ide_tejari" },
        { key: "ide_tozih", type: "textarea", label: "توضیحات بیشتر", required: false, column: "ide_tozih" },
      ]),
      settings: defaultSettings("ارسال ایده", "ایده شما با موفقیت ارسال شد. سپاس از مشارکت شما."),
      sms: defaultSms(),
    }),
  },
  {
    key: "tennis",
    name: "ثبت‌نام مسابقات تنیس روی میز",
    description: "مشخصات فرد شاغل و شرکت‌کننده + تاریخ تولد شمسی + منطق شرطی عضویت",
    icon: "Trophy",
    build: () => competitionBuild("فرم ثبت‌نام مسابقات تنیس روی میز", "ثبت نام"),
  },
  {
    key: "airhockey",
    name: "ثبت‌نام مسابقات ایرهاکی",
    description: "مشخصات فرد شاغل و شرکت‌کننده + تاریخ تولد شمسی + منطق شرطی عضویت",
    icon: "Target",
    build: () => competitionBuild("فرم ثبت‌نام مسابقات ایرهاکی", "ثبت نام"),
  },
  {
    key: "airhockey-boys",
    name: "ثبت‌نام ایرهاکی (ویژه پسران)",
    description: "نسخه ویژه پسران مسابقات ایرهاکی با همان ساختار کامل",
    icon: "Users",
    build: () =>
      competitionBuild("فرم ثبت‌نام مسابقات ایرهاکی ویژه پسران", "ثبت نام"),
  },
  {
    key: "excel-course",
    name: "ثبت‌نام دوره آموزشی اکسل",
    description: "مشخصات فرد شاغل و شرکت‌کننده + تاریخ تولد شمسی + منطق شرطی عضویت",
    icon: "GraduationCap",
    build: () => competitionBuild("فرم ثبت‌نام دوره آموزشی نرم افزار اکسل", "ثبت نام"),
  },
];

export function getTemplate(key: string): FormTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

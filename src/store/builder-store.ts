import { create } from "zustand";
import type { FieldConfig, FieldType, FormSchema } from "@/types";
import { createDefaultField, DB_VALUE_TYPES } from "@/registry/field-registry";
import { uid } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type DeviceWidth = "desktop" | "tablet" | "mobile";

interface HistoryEntry {
  form: FormSchema;
  coalesceKey: string | null;
}

interface BuilderState {
  form: FormSchema | null;
  loaded: boolean;
  selectedFieldId: string | null;
  isPreviewMode: boolean;
  device: DeviceWidth;
  saveState: SaveState;
  dirty: boolean;
  history: HistoryEntry[];
  historyIndex: number;

  loadForm: (form: FormSchema) => void;
  patchForm: (updates: Partial<FormSchema>, coalesceKey?: string) => void;
  addField: (type: FieldType, index?: number) => void;
  updateField: (id: string, updates: Partial<FieldConfig>, coalesceKey?: string) => void;
  removeField: (id: string) => void;
  duplicateField: (id: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  reorderField: (activeId: string, overId: string) => void;
  selectField: (id: string | null) => void;
  setPreviewMode: (mode: boolean) => void;
  setDevice: (device: DeviceWidth) => void;
  setSaveState: (state: SaveState) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const COALESCE_MS = 700;

export function emptyForm(name = "فرم جدید"): FormSchema {
  const now = new Date().toISOString();
  const slug = uid("form");
  return {
    id: uid("form"),
    name,
    slug,
    table: "",
    description: "",
    status: "draft",
    publishedAt: null,
    fields: [],
    settings: {
      submitText: "ثبت اطلاعات",
      successMessage: "اطلاعات شما با موفقیت ثبت شد. سپاس از همراهی شما.",
      theme: "dark",
    },
    sms: {
      enabled: false,
      mode: "verify",
      templateId: "",
      parameters: [],
      message: "سلام {NAME}، ثبت‌نام شما با موفقیت انجام شد.",
      apiKey: "",
      lineNumber: "",
    },
    createdAt: now,
    updatedAt: now,
  };
}

export const useBuilderStore = create<BuilderState>((set, get) => {
  function commit(form: FormSchema, coalesceKey: string | null, extra?: Partial<BuilderState>) {
    const { history, historyIndex } = get();
    const last = history[historyIndex];
    const now = Date.now();
    if (
      last &&
      coalesceKey &&
      last.coalesceKey === coalesceKey &&
      now - (last.form.updatedAt ? new Date(last.form.updatedAt).getTime() : 0) < COALESCE_MS * 40
    ) {
      const merged = [...history.slice(0, historyIndex), { form, coalesceKey }];
      set({ form, dirty: true, history: merged, historyIndex: merged.length - 1, ...extra });
      return;
    }
    const next = [...history.slice(0, historyIndex + 1), { form, coalesceKey }].slice(-100);
    set({ form, dirty: true, history: next, historyIndex: next.length - 1, ...extra });
  }

  return {
    form: null,
    loaded: false,
    selectedFieldId: null,
    isPreviewMode: false,
    device: "desktop",
    saveState: "idle",
    dirty: false,
    history: [],
    historyIndex: -1,

    loadForm: (form) =>
      set({
        form: structuredClone(form),
        loaded: true,
        selectedFieldId: null,
        isPreviewMode: false,
        dirty: false,
        history: [{ form: structuredClone(form), coalesceKey: null }],
        historyIndex: 0,
      }),

    patchForm: (updates, coalesceKey) => {
      const { form } = get();
      if (!form) return;
      commit({ ...form, ...updates, updatedAt: new Date().toISOString() }, coalesceKey ?? null);
    },

    addField: (type, index) => {
      const { form } = get();
      if (!form) return;
      const field = createDefaultField(type, form.fields.filter((f) => DB_VALUE_TYPES.includes(f.type)).length);
      const fields = [...form.fields];
      const at = typeof index === "number" ? Math.min(Math.max(index, 0), fields.length) : fields.length;
      fields.splice(at, 0, field);
      commit({ ...form, fields, updatedAt: new Date().toISOString() }, null, { selectedFieldId: field.id });
    },

    updateField: (id, updates, coalesceKey) => {
      const { form } = get();
      if (!form) return;
      const fields = form.fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
      commit({ ...form, fields, updatedAt: new Date().toISOString() }, coalesceKey ?? null);
    },

    removeField: (id) => {
      const { form, selectedFieldId } = get();
      if (!form) return;
      const fields = form.fields.filter((f) => f.id !== id);
      commit(
        { ...form, fields, updatedAt: new Date().toISOString() },
        null,
        selectedFieldId === id ? { selectedFieldId: null } : undefined
      );
    },

    duplicateField: (id) => {
      const { form } = get();
      if (!form) return;
      const idx = form.fields.findIndex((f) => f.id === id);
      if (idx === -1) return;
      const original = form.fields[idx];
      const copy: FieldConfig = {
        ...structuredClone(original),
        id: uid("f"),
        column: `${original.column}_c${Math.random().toString(36).slice(2, 4)}`,
        label: `${original.label} (کپی)`,
      };
      const fields = [...form.fields];
      fields.splice(idx + 1, 0, copy);
      commit({ ...form, fields, updatedAt: new Date().toISOString() }, null, { selectedFieldId: copy.id });
    },

    moveField: (fromIndex, toIndex) => {
      const { form } = get();
      if (!form) return;
      const fields = [...form.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(Math.min(Math.max(toIndex, 0), fields.length), 0, moved);
      commit({ ...form, fields, updatedAt: new Date().toISOString() }, null);
    },

    reorderField: (activeId, overId) => {
      const { form } = get();
      if (!form || activeId === overId) return;
      const from = form.fields.findIndex((f) => f.id === activeId);
      const to = form.fields.findIndex((f) => f.id === overId);
      if (from === -1 || to === -1) return;
      get().moveField(from, to);
    },

    selectField: (id) => set({ selectedFieldId: id }),
    setPreviewMode: (mode) => set({ isPreviewMode: mode, selectedFieldId: mode ? null : get().selectedFieldId }),
    setDevice: (device) => set({ device }),
    setSaveState: (saveState) => set({ saveState }),
    markSaved: () => set({ dirty: false, saveState: "saved" }),

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const next = historyIndex - 1;
        set({ form: structuredClone(history[next].form), historyIndex: next, dirty: true });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const next = historyIndex + 1;
        set({ form: structuredClone(history[next].form), historyIndex: next, dirty: true });
      }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  };
});

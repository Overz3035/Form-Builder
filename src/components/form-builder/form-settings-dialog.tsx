"use client";

import * as React from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/builder-store";
import type { FormSchema } from "@/types";

interface FormSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormSettingsDialog({ open, onOpenChange }: FormSettingsDialogProps) {
  const { form, patchForm } = useBuilderStore();
  if (!form) return null;

  const dbFields = form.fields.filter((f) =>
    ["text", "email", "phone", "password", "url", "textarea", "select", "radio", "checkbox", "number", "date", "time", "rating", "slider"].includes(f.type)
  );
  const phoneField = form.fields.find((f) => f.type === "phone");

  const setSettings = (patch: Partial<FormSchema["settings"]>) =>
    patchForm({ settings: { ...form.settings, ...patch } });
  const setSms = (patch: Partial<FormSchema["sms"]>) =>
    patchForm({ sms: { ...form.sms, ...patch } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} label="تنظیمات فرم" className="max-w-xl">
      <DialogHeader title="تنظیمات فرم" description="متن دکمه، پیام موفقیت و تنظیمات پیامک پس از ثبت." />
      <DialogBody>
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">فرم</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-submit">متن دکمه ثبت</Label>
                <Input
                  id="s-submit"
                  className="mt-1.5"
                  value={form.settings.submitText}
                  onChange={(e) => setSettings({ submitText: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="s-theme">تم فرم خروجی</Label>
                <Select
                  id="s-theme"
                  className="mt-1.5"
                  value={form.settings.theme}
                  onChange={(e) => setSettings({ theme: e.target.value as "dark" | "light" })}
                  options={[
                    { value: "dark", label: "تیره" },
                    { value: "light", label: "روشن" },
                  ]}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="s-success">پیام پس از ثبت موفق</Label>
              <Textarea
                id="s-success"
                rows={2}
                className="mt-1.5"
                value={form.settings.successMessage}
                onChange={(e) => setSettings({ successMessage: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-desc">توضیحات فرم (نمایش در بالای فرم)</Label>
              <Textarea
                id="s-desc"
                rows={2}
                className="mt-1.5"
                value={form.description}
                onChange={(e) => patchForm({ description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                پیامک پس از ثبت
              </h3>
              <Switch
                checked={form.sms.enabled}
                onCheckedChange={(v) => setSms({ enabled: v })}
                aria-label="فعال‌سازی پیامک"
              />
            </div>

            {form.sms.enabled && (
              <div className="space-y-3 rounded-xl border border-border bg-white/[0.02] p-4">
                {!phoneField && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-400">
                    برای ارسال پیامک، ابتدا یک فیلد «شماره موبایل» به فرم اضافه کنید.
                  </p>
                )}
                <div>
                  <Label htmlFor="sms-mode">روش ارسال</Label>
                  <Select
                    id="sms-mode"
                    className="mt-1.5"
                    value={form.sms.mode}
                    onChange={(e) => setSms({ mode: e.target.value as "verify" | "bulk" })}
                    options={[
                      { value: "verify", label: "الگوی آماده (Verify)" },
                      { value: "bulk", label: "متن آزاد (Bulk)" },
                    ]}
                  />
                </div>

                {form.sms.mode === "verify" ? (
                  <>
                    <div>
                      <Label htmlFor="sms-template">شناسه الگو (Template ID)</Label>
                      <Input
                        id="sms-template"
                        dir="ltr"
                        className="mt-1.5 font-mono text-xs"
                        placeholder="10000000000000"
                        value={form.sms.templateId}
                        onChange={(e) => setSms({ templateId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>پارامترهای الگو</Label>
                        <button
                          onClick={() =>
                            setSms({
                              parameters: [...form.sms.parameters, { name: "NAME", fieldId: dbFields[0]?.id || "" }],
                            })
                          }
                          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <Plus className="h-3 w-3" />
                          افزودن
                        </button>
                      </div>
                      {form.sms.parameters.length === 0 && (
                        <p className="rounded-lg border border-dashed border-border py-3 text-center text-[11px] text-muted-foreground">
                          مثال: پارامتر NAME از فیلد «نام و نام خانوادگی»
                        </p>
                      )}
                      {form.sms.parameters.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            dir="ltr"
                            aria-label="نام پارامتر"
                            className="h-9 w-36 font-mono text-xs uppercase"
                            placeholder="NAME"
                            value={p.name}
                            onChange={(e) =>
                              setSms({
                                parameters: form.sms.parameters.map((pp, j) =>
                                  j === i ? { ...pp, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") } : pp
                                ),
                              })
                            }
                          />
                          <Select
                            aria-label="فیلد منبع"
                            className="h-9 flex-1 text-xs"
                            value={p.fieldId}
                            onChange={(e) =>
                              setSms({
                                parameters: form.sms.parameters.map((pp, j) => (j === i ? { ...pp, fieldId: e.target.value } : pp)),
                              })
                            }
                            options={dbFields.map((f) => ({ value: f.id, label: f.label }))}
                          />
                          <button
                            aria-label="حذف پارامتر"
                            onClick={() => setSms({ parameters: form.sms.parameters.filter((_, j) => j !== i) })}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <Label htmlFor="sms-msg">متن پیامک</Label>
                    <Textarea
                      id="sms-msg"
                      rows={3}
                      className="mt-1.5"
                      placeholder="سلام {NAME}، ثبت شما انجام شد."
                      value={form.sms.message}
                      onChange={(e) => setSms({ message: e.target.value })}
                    />
                    <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                      از نام ستون‌ها به‌صورت <span dir="ltr" className="font-mono">{"{col_1}"}</span> استفاده کنید. مقصد پیامک، فیلد شماره موبایل است.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sms-key">کلید API پیامک</Label>
                    <Input
                      id="sms-key"
                      dir="ltr"
                      type="password"
                      className="mt-1.5 font-mono text-xs"
                      placeholder="پیش‌فرض ژنراتور"
                      value={form.sms.apiKey}
                      onChange={(e) => setSms({ apiKey: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sms-line">شماره خط</Label>
                    <Input
                      id="sms-line"
                      dir="ltr"
                      className="mt-1.5 font-mono text-xs"
                      placeholder="پیش‌فرض ژنراتور"
                      value={form.sms.lineNumber}
                      onChange={(e) => setSms({ lineNumber: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  اگر خالی بماند، کلید و خط پیش‌فرض تعریف‌شده در ژنراتور استفاده می‌شود.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>ذخیره و بستن</Button>
      </DialogFooter>
    </Dialog>
  );
}

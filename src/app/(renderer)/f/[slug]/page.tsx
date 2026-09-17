"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CircleCheck, FileQuestion, Loader2, Lock } from "lucide-react";
import { FormRenderer } from "@/components/form-renderer/renderer";
import type { ControlValue } from "@/components/form-renderer/field-controls";
import type { FormSchema } from "@/types";

export default function PublicFormPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"form" | "done" | "error">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/f/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || "فرم یافت نشد");
        setSchema(data.form);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <Center>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Center>
    );
  }

  if (!schema) {
    return (
      <Center>
        <EmptyState
          icon={<FileQuestion className="h-7 w-7" />}
          title="فرم یافت نشد"
          text={error || "این فرم وجود ندارد یا حذف شده است."}
        />
      </Center>
    );
  }

  if (schema.status !== "published") {
    return (
      <Center>
        <EmptyState
          icon={<Lock className="h-7 w-7" />}
          title="فرم در دسترس نیست"
          text="این فرم هنوز منتشر نشده است."
        />
      </Center>
    );
  }

  if (state === "done") {
    return (
      <Center>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="glass w-full max-w-md rounded-2xl p-10 text-center shadow-2xl"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CircleCheck className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">ثبت شد</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{schema.settings.successMessage}</p>
        </motion.div>
      </Center>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative mx-auto max-w-2xl px-4 py-14">
        <FormRenderer
          schema={schema}
          onSubmit={async (data: Record<string, ControlValue>) => {
            const res = await fetch(`/api/f/${slug}/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(resData.error || "خطا در ثبت اطلاعات");
              setState("error");
              throw new Error(resData.error);
            }
            setState("done");
          }}
        />
        {state === "error" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/8 p-4 text-center text-sm text-rose-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">{children}</div>;
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass max-w-md rounded-2xl p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        {icon}
      </div>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

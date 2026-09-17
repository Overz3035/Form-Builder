"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { BuilderLayout } from "@/components/form-builder/builder-layout";
import { useBuilderStore } from "@/store/builder-store";

export default function BuilderPage() {
  const params = useParams();
  const id = String(params.id || "");
  const { form, loadForm } = useBuilderStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/forms/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(data.error || "خطا در دریافت فرم");
        if (data.form) {
          loadForm(data.form);
        } else {
          setError("فرم یافت نشد");
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, loadForm]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری فرم...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/5 p-8 text-center">
          <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <h1 className="text-lg font-semibold text-foreground">خطا</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) return null;
  return <BuilderLayout />;
}

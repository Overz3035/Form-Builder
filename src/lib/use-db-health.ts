"use client";

import { useEffect, useState } from "react";

export interface DbHealthState {
  ok: boolean | null;
  message: string;
  hint?: string;
  loading: boolean;
}

export function useDbHealth(pollMs = 30000): DbHealthState {
  const [state, setState] = useState<DbHealthState>({ ok: null, message: "", loading: true });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = await res.json();
        if (alive) setState({ ok: data.ok, message: data.message, hint: data.hint, loading: false });
      } catch {
        if (alive) setState({ ok: false, message: "اتصال به سرور اپلیکیشن برقرار نشد", loading: false });
      }
    };
    check();
    const t = window.setInterval(check, pollMs);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pollMs]);

  return state;
}

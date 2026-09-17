"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  addToast: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CircleCheck className="h-4.5 w-4.5 text-emerald-400" />,
  error: <CircleAlert className="h-4.5 w-4.5 text-rose-400" />,
  info: <Info className="h-4.5 w-4.5 text-cyan-400" />,
  warning: <TriangleAlert className="h-4.5 w-4.5 text-amber-400" />,
};

const BAR: Record<ToastVariant, string> = {
  success: "bg-emerald-400",
  error: "bg-rose-400",
  info: "bg-cyan-400",
  warning: "bg-amber-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => remove(id), t.duration ?? 4000);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-5 z-[100] flex w-96 max-w-[calc(100vw-2.5rem)] flex-col gap-2"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: -24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-border-strong bg-popover/95 py-3.5 pl-4 pr-3 shadow-2xl shadow-black/40 backdrop-blur-xl"
              )}
            >
              <span className={cn("absolute inset-y-0 right-0 w-1", BAR[toast.variant])} />
              <span className="mt-0.5 shrink-0">{ICONS[toast.variant]}</span>
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold text-foreground">{toast.title}</p>}
                <p className={cn("text-sm text-muted-foreground", toast.title && "mt-0.5")}>{toast.message}</p>
              </div>
              <button
                onClick={() => remove(toast.id)}
                aria-label="بستن اعلان"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GREG_MONTHS_FA,
  JALALI_MONTHS,
  WEEKDAYS,
  formatGregorianDate,
  formatJalaliDate,
  gregorianMonthLength,
  gregorianToJalali,
  isoFromGregorian,
  isoToJalaliParts,
  jalaliMonthLength,
  jalaliToGregorian,
  parseIsoDate,
  todayIso,
} from "@/lib/jalali";

type CalSystem = "jalali" | "gregorian";

interface DualDatePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}

export function JalaliDatePicker({ id, value, onChange, disabled, invalid, placeholder }: DualDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [cal, setCal] = React.useState<CalSystem>("jalali");
  const [view, setView] = React.useState<{ y: number; m: number }>(() => {
    const now = new Date();
    const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { y: j.jy, m: j.jm };
  });
  const rootRef = React.useRef<HTMLDivElement>(null);

  const syncViewToValue = React.useCallback(
    (system: CalSystem, iso: string) => {
      if (iso) {
        if (system === "jalali") {
          const p = isoToJalaliParts(iso);
          if (p) {
            setView({ y: p.jy, m: p.jm });
            return;
          }
        } else {
          const g = parseIsoDate(iso);
          if (g) {
            setView({ y: g.gy, m: g.gm });
            return;
          }
        }
      }
      const now = new Date();
      if (system === "jalali") {
        const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        setView({ y: j.jy, m: j.jm });
      } else {
        setView({ y: now.getFullYear(), m: now.getMonth() + 1 });
      }
    },
    []
  );

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) syncViewToValue(cal, value);
    setOpen(!open);
  };

  const switchCal = (next: CalSystem) => {
    if (next === cal) return;
    if (next === "gregorian") {
      const g = jalaliToGregorian(view.y, view.m, 1);
      setView({ y: g.gy, m: g.gm });
    } else {
      const j = gregorianToJalali(view.y, view.m, 1);
      setView({ y: j.jy, m: j.jm });
    }
    setCal(next);
  };

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInMonth = cal === "jalali" ? jalaliMonthLength(view.y, view.m) : gregorianMonthLength(view.y, view.m);
  const firstDow =
    cal === "jalali"
      ? (() => {
          const g = jalaliToGregorian(view.y, view.m, 1);
          return new Date(g.gy, g.gm - 1, g.gd).getDay();
        })()
      : new Date(view.y, view.m - 1, 1).getDay();
  const leading = (firstDow + 1) % 7; // Saturday-first grid
  const today = todayIso();

  const move = (delta: number) => {
    setView((v) => {
      const max = cal === "jalali" ? 12 : 12;
      let m = v.m + delta;
      let y = v.y;
      if (m > max) {
        m = 1;
        y += 1;
      }
      if (m < 1) {
        m = max;
        y -= 1;
      }
      return { y, m };
    });
  };

  const dayIso = (d: number): string => {
    const g = cal === "jalali" ? jalaliToGregorian(view.y, view.m, d) : { gy: view.y, gm: view.m, gd: d };
    return isoFromGregorian(g.gy, g.gm, g.gd);
  };

  const pick = (day: number) => {
    onChange(dayIso(day));
    setOpen(false);
  };

  const pickToday = () => {
    onChange(today);
    const g = parseIsoDate(today)!;
    if (cal === "jalali") {
      const j = gregorianToJalali(g.gy, g.gm, g.gd);
      setView({ y: j.jy, m: j.jm });
    } else {
      setView({ y: g.gy, m: g.gm });
    }
    setOpen(false);
  };

  const title =
    cal === "jalali"
      ? `${JALALI_MONTHS[view.m - 1]} ${view.y.toLocaleString("fa-IR", { useGrouping: false })}`
      : `${GREG_MONTHS_FA[view.m - 1]} ${view.y}`;

  const display = !value ? null : cal === "jalali" ? formatJalaliDate(value) : formatGregorianDate(value);
  const altDisplay = !value ? null : cal === "jalali" ? formatGregorianDate(value) : formatJalaliDate(value);

  return (
    <div ref={rootRef} data-jp-root className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleOpen}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-white/[0.03] px-3.5 text-sm text-foreground shadow-sm transition-colors",
          "hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive/60"
        )}
      >
        <span className={cn("flex min-w-0 items-baseline gap-2", !value && "text-muted-foreground/60")}>
          {display ? (
            <>
              <span className="truncate">{display}</span>
              {altDisplay && (
                <span dir="ltr" className="shrink-0 text-[11px] text-muted-foreground/70">
                  {altDisplay}
                </span>
              )}
            </>
          ) : (
            placeholder || "انتخاب تاریخ..."
          )}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="پاک کردن تاریخ"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onChange("");
              }
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-label="انتخاب تاریخ"
            className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 rounded-2xl border border-border-strong bg-popover p-3 shadow-2xl shadow-black/40"
          >
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.04] p-1" role="tablist" aria-label="نوع تقویم">
              {(["jalali", "gregorian"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={cal === c}
                  onClick={() => switchCal(c)}
                  className={cn(
                    "cursor-pointer rounded-md py-1 text-xs font-medium transition-colors",
                    cal === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c === "jalali" ? "شمسی" : "میلادی"}
                </button>
              ))}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="ماه قبل"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-foreground">{title}</span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="ماه بعد"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-[10px] font-medium text-muted-foreground">
                  {w}
                </span>
              ))}
              {Array.from({ length: leading }, (_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const iso = dayIso(day);
                const isSelected = value !== "" && iso === value;
                const isToday = iso === today;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    aria-label={cal === "jalali" ? `روز ${day} ${JALALI_MONTHS[view.m - 1]}` : `روز ${day} ${GREG_MONTHS_FA[view.m - 1]}`}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors",
                      isSelected
                        ? "bg-primary font-bold text-primary-foreground"
                        : isToday
                          ? "border border-primary/40 text-primary hover:bg-primary/10"
                          : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {cal === "jalali" ? day.toLocaleString("fa-IR", { useGrouping: false }) : day}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 border-t border-border pt-2 text-center">
              <button
                type="button"
                onClick={pickToday}
                className="w-full cursor-pointer rounded-lg py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                امروز
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

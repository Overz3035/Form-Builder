"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JALALI_MONTHS,
  WEEKDAYS,
  formatJalaliDate,
  gregorianToJalali,
  isoFromGregorian,
  isoToJalaliParts,
  jalaliMonthLength,
  jalaliToGregorian,
} from "@/lib/jalali";

interface JalaliDatePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}

export function JalaliDatePicker({ id, value, onChange, disabled, invalid, placeholder }: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const today = new Date();
  const selectedJ = value ? isoToJalaliParts(value) : null;
  const initialParts = isoToJalaliParts(value || "");
  const [view, setView] = React.useState(() => {
    if (initialParts) return { jy: initialParts.jy, jm: initialParts.jm };
    return { jy: gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate()).jy, jm: gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate()).jm };
  });

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInMonth = jalaliMonthLength(view.jy, view.jm);
  const firstGreg = jalaliToGregorian(view.jy, view.jm, 1);
  const firstDow = new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd).getDay(); // 0=Sunday
  const leading = (firstDow + 1) % 7; // Saturday-first grid
  const todayJal = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const move = (delta: number) => {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      return { jy, jm };
    });
  };

  const pick = (jd: number) => {
    const g = jalaliToGregorian(view.jy, view.jm, jd);
    onChange(isoFromGregorian(g.gy, g.gm, g.gd));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-white/[0.03] px-3.5 text-sm text-foreground shadow-sm transition-colors",
          "hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive/60"
        )}
      >
        <span className={cn(!value && "text-muted-foreground/60")}>
          {value ? formatJalaliDate(value) : placeholder || "انتخاب تاریخ..."}
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
            onKeyDown={(e) => e.key === "Enter" && onChange("")}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Calendar className="h-4 w-4 text-muted-foreground" />
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
            aria-label="انتخاب تاریخ شمسی"
            className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 rounded-2xl border border-border-strong bg-popover p-3 shadow-2xl shadow-black/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="ماه قبل"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-foreground">
                {JALALI_MONTHS[view.jm - 1]} {view.jy.toLocaleString("fa-IR", { useGrouping: false })}
              </span>
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
                const isSelected = selectedJ && selectedJ.jy === view.jy && selectedJ.jm === view.jm && selectedJ.jd === day;
                const isToday = todayJal.jy === view.jy && todayJal.jm === view.jm && todayJal.jd === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    aria-label={`روز ${day}`}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors",
                      isSelected
                        ? "bg-primary font-bold text-primary-foreground"
                        : isToday
                          ? "border border-primary/40 text-primary hover:bg-primary/10"
                          : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {day.toLocaleString("fa-IR", { useGrouping: false })}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 border-t border-border pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  const g = jalaliToGregorian(todayJal.jy, todayJal.jm, todayJal.jd);
                  onChange(isoFromGregorian(g.gy, g.gm, g.gd));
                  setOpen(false);
                }}
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

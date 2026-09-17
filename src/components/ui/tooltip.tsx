"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [show, setShow] = React.useState(false);
  const timeout = React.useRef<number | null>(null);

  const enter = () => {
    timeout.current = window.setTimeout(() => setShow(true), 350);
  };
  const leave = () => {
    if (timeout.current) window.clearTimeout(timeout.current);
    setShow(false);
  };

  React.useEffect(() => () => {
    if (timeout.current) window.clearTimeout(timeout.current);
  }, []);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "pointer-events-none absolute right-1/2 z-50 translate-x-1/2 whitespace-nowrap rounded-lg border border-border-strong bg-popover px-2.5 py-1.5 text-xs text-foreground shadow-xl",
              side === "top" ? "bottom-[calc(100%+7px)]" : "top-[calc(100%+7px)]"
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

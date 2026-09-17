import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-accent-foreground border border-primary/25",
        success: "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25",
        warning: "bg-amber-500/12 text-amber-400 border border-amber-500/25",
        danger: "bg-rose-500/12 text-rose-400 border border-rose-500/25",
        neutral: "bg-secondary text-muted-foreground border border-border",
        info: "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

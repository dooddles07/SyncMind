import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Every badge carries a word. Colour is never the only signal.
  Text uses the derived *-text tokens: the documented semantic colours
  fail 4.5:1 in light mode.
*/
const badge = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[13px] font-medium leading-[1.4] tracking-[0.005em]",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-accent text-success-text",
        warning: "bg-accent text-warning-text",
        destructive: "bg-accent text-destructive-text",
        info: "bg-accent text-info-text",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {
  /** Renders a leading dot so the state reads without relying on the text colour. */
  dot?: boolean;
}

const DOT: Record<string, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  outline: "bg-muted-foreground",
};

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badge({ variant }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", DOT[variant ?? "neutral"])}
        />
      ) : null}
      {children}
    </span>
  );
}

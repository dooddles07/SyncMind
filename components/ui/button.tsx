import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-[var(--radius-md)]",
    // hover and focus are colour only, 120ms; press is an 80ms scale
    "transition-[color,background-color,border-color,opacity,transform] duration-[120ms] ease-out",
    "active:scale-[0.98] active:duration-[80ms]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-92",
        secondary:
          "bg-muted text-foreground border border-border hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-primary-foreground hover:opacity-92",
        // input-strong, not input: input is 1.23:1 and fails WCAG 1.4.11
        outline:
          "border border-input-strong text-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-[14px] [&_svg]:size-[14px]",
        md: "h-10 px-4 text-[14px] [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
  loading?: boolean;
  /** Shown while loading. Keep it a verb, matching the action that started it. */
  loadingLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild, loading, loadingLabel, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingLabel ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

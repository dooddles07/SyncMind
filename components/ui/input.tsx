import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Border is input-strong, not input. --input is 1.23:1 against the background
  and fails WCAG 1.4.11 for control boundaries. This is the one deliberate
  divergence from stock shadcn. See docs/UI-BUILD-PLAN.md "Corrections".

  The focus ring comes from the global :focus-visible rule in globals.css,
  so it can never be forgotten on an individual control.
*/
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border bg-card px-3",
        "text-[15px] leading-[1.6] text-foreground",
        "placeholder:text-muted-foreground",
        "transition-colors duration-[120ms] ease-out",
        "hover:border-muted-foreground",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
        invalid ? "border-destructive" : "border-input-strong",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "min-h-24 w-full rounded-[var(--radius-md)] border bg-card p-3",
      "text-[15px] leading-[1.6] text-foreground",
      "placeholder:text-muted-foreground",
      "transition-colors duration-[120ms] ease-out",
      "hover:border-muted-foreground",
      "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
      invalid ? "border-destructive" : "border-input-strong",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/**
 * Label plus control plus help or error text, tied together.
 * Errors say what to do, and sit below the field they belong to.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      {/* visible label, never placeholder-only */}
      <label htmlFor={id} className="text-[14px] font-medium leading-[1.5]">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-describedby": describedBy,
          })
        : children}
      {error ? (
        <p id={`${id}-error`} className="text-[14px] leading-[1.5] text-destructive-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[14px] leading-[1.5] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

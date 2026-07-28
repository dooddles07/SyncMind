import { cn } from "@/lib/utils";

/*
  Determinate only. Used by upload part-preparation and the quota meter.
  aria-valuenow is what a screen reader reads, so the label is required.
*/
export function Progress({
  value,
  max = 100,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  max?: number;
  /** Describes what is progressing, e.g. "Getting your recording ready". */
  label: string;
  tone?: "primary" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-[180ms] ease-out", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  label,
  tone = "done",
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "done" | "said";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
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
        className={cn(
          "h-full rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          tone === "done" ? "bg-done" : "bg-said",
        )}
        style={{ width: "100%", transform: `translateX(${pct - 100}%)` }}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-6 text-[13px]",
  md: "size-8 text-[14px]",
  lg: "size-10 text-[15px]",
} as const;

/** Initial-only fallback. Decorative when a name sits beside it, so it is aria-hidden. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground",
        SIZE[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

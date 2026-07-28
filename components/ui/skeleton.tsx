import { cn } from "@/lib/utils";

/*
  1.4s linear sweep. The global prefers-reduced-motion block in globals.css
  freezes it, which is why the base colour has to read as a placeholder on its own.
*/
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Dashboard list placeholder. Every list surface ships loading, empty and error. */
export function MeetingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-64" />
    </div>
  );
}

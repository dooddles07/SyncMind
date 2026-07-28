import { cn } from "@/lib/utils";

/*
  Two arcs turning toward each other, offset so the circle never quite closes.
  Two voices syncing, and a loop that holds what was said. The heavier arc is amber
  (what was said), the lighter is teal (what was kept).
*/
export function Mark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden>
      <path
        d="M26 10.5A12 12 0 0 0 4.6 13.4"
        stroke={mono ? "currentColor" : "var(--said)"}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M6 21.5A12 12 0 0 0 27.4 18.6"
        stroke={mono ? "currentColor" : "var(--done)"}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className, mono }: { className?: string; mono?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark mono={mono} />
      <span className="font-display text-lg font-semibold tracking-[-0.02em]">SyncMind</span>
    </span>
  );
}

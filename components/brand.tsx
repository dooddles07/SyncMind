import { cn } from "@/lib/utils";

/*
  Sound stands up, writing lies down.

  Three vertical bars step down as a voice settles, then a fourth turns through a
  true quarter circle and lies down as the baseline. Everything before the turn is
  amber, what a person said. Everything from the turn on is teal, the record that
  survived it. Same rule the rest of the UI runs on.

  Geometry is on a 32 grid with stroke 3 and 5.3 spacing, so the 2.3 unit gaps
  between bars stay open at 24px instead of merging into a block.
*/
export function Mark({ className, mono = false }: { className?: string; mono?: boolean }) {
  const said = mono ? "currentColor" : "var(--said)";
  const done = mono ? "currentColor" : "var(--done)";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      className={cn("size-7", className)}
      aria-hidden
    >
      {/* the voices, stepping down */}
      <path d="M6.6 5V20.5" stroke={said} />
      <path d="M11.9 9V20.5" stroke={said} />
      <path d="M17.2 13V20.5" stroke={said} />

      {/* the fourth turns and becomes the line */}
      <path d="M22.5 16.5v6.4a3.6 3.6 0 0 1-3.6 3.6" stroke={done} />
      <path d="M4.7 26.5h22.6" stroke={done} />
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

import Link from "next/link";

// Placeholder. The Landing screen is built in Phase 3, see docs/UI-BUILD-PLAN.md.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[68ch] flex-col justify-center gap-4 px-8">
      <h1 className="font-display text-[32px] leading-[1.15] tracking-[-0.02em]">
        SyncMind
      </h1>
      <p className="text-[15px] leading-[1.6] text-muted-foreground">
        Foundation is in place. Components and screens follow in phases 2 and 3.
      </p>
      <Link
        href="/foundations"
        className="w-fit rounded-[var(--radius-md)] bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground transition-opacity duration-[120ms] ease-out hover:opacity-92"
      >
        View the foundations
      </Link>
    </main>
  );
}

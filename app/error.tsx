"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Application logs record errors and codes, never transcript content or user data
    // (see docs/SECURITY-PRIVACY.md §6) — safe to log the bare error here.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-5 py-16">
      <Wordmark />
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="That's on us, not on you. Try again, or head back and pick up where you left off."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        }
        className="max-w-md border-none [&_svg]:text-overdue-text"
      />
    </div>
  );
}

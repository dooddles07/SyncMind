"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Next.js scopes error boundaries per route segment -- this one catches errors
 *  inside (app)/* specifically, so "Go home" can point at /dashboard instead of
 *  the root app/error.tsx's "/" (the marketing landing page, wrong destination
 *  for someone already signed in and inside the app). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
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
              <Link href="/dashboard">Go home</Link>
            </Button>
          </div>
        }
        className="max-w-md border-none [&_svg]:text-overdue-text"
      />
    </div>
  );
}

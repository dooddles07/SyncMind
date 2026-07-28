import { Compass } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-5 py-16">
      <Wordmark />
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        description="The link may be old, or the address may be off. Nothing to worry about."
        action={
          <Button asChild>
            <Link href="/">Back to SyncMind</Link>
          </Button>
        }
        className="max-w-md border-none"
      />
    </div>
  );
}

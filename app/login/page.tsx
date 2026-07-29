import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginButton } from "@/components/app/login-button";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-5 py-16 text-center">
      <Wordmark />
      <div>
        <h1 className="text-h1">Sign in to SyncMind</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          One account, no password. We only ask for your name and email.
        </p>
      </div>
      <Suspense>
        <LoginButton />
      </Suspense>
    </div>
  );
}

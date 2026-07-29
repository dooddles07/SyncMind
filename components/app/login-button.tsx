"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const next = useSearchParams().get("next") ?? "/dashboard";

  async function signIn() {
    setPending(true);
    // redirectTo must be the exact literal string registered in Supabase's Redirect
    // URLs allow-list -- no query string. Carrying "next" there caused Supabase to
    // silently reject the redirect and fall back to the bare Site URL instead. A
    // short-lived cookie survives the whole Google -> Supabase -> us round trip
    // without touching the URL Supabase validates.
    document.cookie = `post_login_redirect=${encodeURIComponent(next)}; path=/; max-age=300; samesite=lax`;
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  return (
    <Button onClick={signIn} disabled={pending} size="lg">
      <GoogleIcon />
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}

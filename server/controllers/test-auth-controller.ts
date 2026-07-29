// Test-only sign-in stub for Playwright E2E (docs/ARCHITECTURE.md section 10).
// Never usable in production: guarded twice, here and in the route handler
// that calls this. Sidesteps the real Google OAuth + /auth/callback PKCE flow
// entirely -- mints a session server-side via the admin API, then hands it to
// the request-scoped SSR client's own setSession() so it writes real,
// correctly-formatted @supabase/ssr cookies itself.
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/server/config/supabase-admin";
import type { Database } from "@/server/models/database.types";

const TEST_USER_EMAIL = "e2e@syncmind.local";

export class TestLoginDisabledError extends Error {}

/** Idempotent: creates the seeded E2E user on first run, reuses it after. */
async function ensureTestUser(): Promise<void> {
  const admin = createAdminClient();
  const { data: existing, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  if (existing.users.some((u) => u.email === TEST_USER_EMAIL)) return;

  const { error: createError } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    email_confirm: true,
  });
  if (createError) throw createError;
}

export async function signInTestUser(serverClient: SupabaseClient<Database>): Promise<void> {
  if (process.env.NODE_ENV === "production" || !process.env.E2E_TEST_SECRET) {
    throw new TestLoginDisabledError("Test sign-in is disabled.");
  }

  await ensureTestUser();

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_USER_EMAIL,
  });
  if (linkError) throw linkError;

  const anon = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError || !verified.session) {
    throw verifyError ?? new Error("verifyOtp returned no session.");
  }

  const { error: setError } = await serverClient.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
  if (setError) throw setError;
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

// Service-role key: bypasses RLS entirely. Used in exactly three places per
// docs/DATA-MODEL.md section 4 -- the public share page, /api/cron/*, and the
// pipeline's storage reads. Every other server path uses the request-scoped user
// client (supabase-server.ts) so RLS still applies. SUPABASE_SERVICE_ROLE_KEY has no
// NEXT_PUBLIC_ prefix, so Next.js strips it from the client bundle even if this were
// imported from a "use client" file by mistake -- the import would just fail at
// runtime with an undefined key rather than leaking it.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

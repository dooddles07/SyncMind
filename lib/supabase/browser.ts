import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/server/models/database.types";

// Publishable key only -- safe in "use client" components. RLS is what actually
// restricts what this client can read or write, not the key's secrecy.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

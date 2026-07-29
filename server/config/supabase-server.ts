import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/server/models/database.types";

// Server Components read data directly through this client (ARCHITECTURE.md section
// 4) -- no /api round-trip for reads the page owns. Publishable key + the caller's
// session cookie; RLS is what actually scopes the rows, same as the browser client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies -- middleware
            // is what actually refreshes the session, this is a harmless no-op.
          }
        },
      },
    },
  );
}

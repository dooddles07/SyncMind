import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { signInTestUser, TestLoginDisabledError } from "@/server/controllers/test-auth-controller";

const NOT_FOUND = NextResponse.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 });

// Never reachable in production (NODE_ENV check) or without the shared
// secret set on both sides -- see server/controllers/test-auth-controller.ts.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || !process.env.E2E_TEST_SECRET) {
    return NOT_FOUND;
  }
  if (request.headers.get("x-e2e-secret") !== process.env.E2E_TEST_SECRET) {
    return NOT_FOUND;
  }

  try {
    const supabase = await createClient();
    await signInTestUser(supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TestLoginDisabledError) return NOT_FOUND;
    throw err;
  }
}

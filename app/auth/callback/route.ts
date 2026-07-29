import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const rawNext = cookieStore.get("post_login_redirect")?.value;
  // Must be an internal relative path -- never redirect wherever an arbitrary
  // cookie value says.
  const next = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete("post_login_redirect");
      return response;
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_failed");
  return NextResponse.redirect(loginUrl);
}

import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { revokeShareLink } from "@/server/models/share-link-model";

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { token } = await params;
  // RLS's "own rows" policy on share_links scopes this delete to the caller's own
  // link -- a token belonging to someone else deletes zero rows, not an error.
  await revokeShareLink(supabase, token);
  return NextResponse.json({ revoked: true });
}

import { NextResponse } from "next/server";
import { deleteAllUserData } from "@/server/controllers/account-controller";
import { createAdminClient } from "@/server/config/supabase-admin";
import { createClient } from "@/server/config/supabase-server";

export async function DELETE() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  // Admin Auth API (auth.admin.deleteUser) needs the service-role client -- the
  // session client can't call it. The id always comes from the verified session
  // above, never from the request body.
  const adminClient = createAdminClient();
  await deleteAllUserData(adminClient, user.id);

  return NextResponse.json({ deleted: true });
}

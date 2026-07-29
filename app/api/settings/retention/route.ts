import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { updateRetentionDays } from "@/server/models/profile-model";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { days } = await request.json();
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 30) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "days must be an integer between 1 and 30." } },
      { status: 400 },
    );
  }

  await updateRetentionDays(supabase, user.id, days);
  return NextResponse.json({ retentionDays: days });
}

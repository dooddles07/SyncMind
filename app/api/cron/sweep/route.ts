import { NextResponse } from "next/server";
import { runSweep } from "@/server/controllers/sweep-controller";
import { createAdminClient } from "@/server/config/supabase-admin";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Invalid cron secret." } }, { status: 401 });
  }

  const supabase = createAdminClient();
  const summary = await runSweep(supabase);
  return NextResponse.json(summary);
}

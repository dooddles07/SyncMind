import { NextResponse } from "next/server";
import { updateActionItemStatus } from "@/server/models/action-item-model";
import { createClient } from "@/server/config/supabase-server";

// UI's TodoStatus ("todo" | "doing" | "done") vs the DB's action_status
// ("todo" | "in_progress" | "done") -- the reverse of the mapping
// lib/mock/data.ts's getTodos already does the other direction.
const UI_TO_DB_STATUS: Record<string, "todo" | "in_progress" | "done"> = {
  todo: "todo",
  doing: "in_progress",
  done: "done",
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await request.json();
  const dbStatus = UI_TO_DB_STATUS[status];
  if (!dbStatus) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "status must be todo, doing, or done." } },
      { status: 400 },
    );
  }

  await updateActionItemStatus(supabase, id, dbStatus);
  return NextResponse.json({ status });
}

import { NextResponse } from "next/server";
import { createMeeting } from "@/server/controllers/meeting-controller";
import { createClient } from "@/server/config/supabase-server";
import { HttpError } from "@/server/utils/http-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware.ts only protects page routes, not app/api/**, so route handlers
  // check their own session.
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const body = await request.json();

  try {
    const result = await createMeeting(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "bad_request", message: err.message } }, { status: err.status });
    }
    throw err;
  }
}

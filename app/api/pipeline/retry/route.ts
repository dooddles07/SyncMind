import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { retryMeeting, RetryNotAllowedError } from "@/server/controllers/pipeline-controller";
import { HttpError } from "@/server/utils/http-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { meetingId } = await request.json();
  if (!meetingId) {
    return NextResponse.json({ error: { code: "bad_request", message: "meetingId is required." } }, { status: 400 });
  }

  try {
    const result = await retryMeeting(supabase, meetingId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "not_found", message: err.message } }, { status: err.status });
    }
    if (err instanceof RetryNotAllowedError) {
      return NextResponse.json({ error: { code: err.reason, message: err.message } }, { status: 409 });
    }
    throw err;
  }
}

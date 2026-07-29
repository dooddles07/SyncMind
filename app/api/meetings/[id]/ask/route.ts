import { NextResponse } from "next/server";
import { AskLimitReachedError, answerQuestion } from "@/server/controllers/ask-controller";
import { createClient } from "@/server/config/supabase-server";
import { getMeetingById } from "@/server/models/meeting-model";
import { HttpError } from "@/server/utils/http-error";
import { QuotaBlockedError } from "@/server/utils/pipeline-errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const { question } = await request.json();
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "question is required." } },
      { status: 400 },
    );
  }

  try {
    const meeting = await getMeetingById(supabase, id);
    if (!meeting) throw new HttpError(404, "Meeting not found.");

    const query = await answerQuestion(supabase, meeting, question.trim());
    return NextResponse.json({ query });
  } catch (err) {
    if (err instanceof AskLimitReachedError) {
      return NextResponse.json({ error: { code: "limit_reached", message: err.message } }, { status: 429 });
    }
    if (err instanceof QuotaBlockedError) {
      return NextResponse.json(
        { error: { code: "quota_blocked", message: "Daily question budget reached. Try again tomorrow." } },
        { status: 429 },
      );
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "error", message: err.message } }, { status: err.status });
    }
    throw err;
  }
}

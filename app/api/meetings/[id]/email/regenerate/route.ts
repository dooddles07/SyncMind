import { NextResponse } from "next/server";
import { draftEmail, type EmailTone } from "@/server/controllers/email-controller";
import { createClient } from "@/server/config/supabase-server";
import { getEmailDraftForMeeting } from "@/server/models/email-draft-model";
import { getMeetingById } from "@/server/models/meeting-model";
import { HttpError } from "@/server/utils/http-error";

const ALLOWED_TONES: EmailTone[] = ["professional", "friendly", "brief"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const { tone } = await request.json();
  if (!ALLOWED_TONES.includes(tone)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "tone must be professional, friendly, or brief." } },
      { status: 400 },
    );
  }

  try {
    const meeting = await getMeetingById(supabase, id);
    if (!meeting) throw new HttpError(404, "Meeting not found.");

    await draftEmail(supabase, meeting, tone as EmailTone);
    const draft = await getEmailDraftForMeeting(supabase, id);
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "error", message: err.message } }, { status: err.status });
    }
    throw err;
  }
}

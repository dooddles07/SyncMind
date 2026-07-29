import { NextResponse } from "next/server";
import { createShareLink } from "@/server/controllers/share-controller";
import { createClient } from "@/server/config/supabase-server";
import { getMeetingById } from "@/server/models/meeting-model";
import { HttpError } from "@/server/utils/http-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const { includeTranscript } = await request.json();

  try {
    const meeting = await getMeetingById(supabase, id);
    if (!meeting) throw new HttpError(404, "Meeting not found.");

    const link = await createShareLink(supabase, meeting, Boolean(includeTranscript));
    return NextResponse.json(link);
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: { code: "error", message: err.message } }, { status: err.status });
    }
    throw err;
  }
}

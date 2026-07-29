import { NextResponse } from "next/server";
import { slugify } from "@/lib/export/ics";
import { buildMarkdown } from "@/lib/export/markdown";
import { buildSrt, buildTxt } from "@/lib/export/transcript";
import { getMeeting, getNotes, getTodos, getTranscript } from "@/lib/mock/data";
import { createClient } from "@/server/config/supabase-server";

const CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown; charset=utf-8",
  srt: "application/x-subrip; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (!format || !(format in CONTENT_TYPES)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "format must be md, srt, or txt." } },
      { status: 400 },
    );
  }

  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: { code: "not_found", message: "Meeting not found." } }, { status: 404 });
  }

  let content: string;
  if (format === "md") {
    const [notes, todos] = await Promise.all([getNotes(id), getTodos(id)]);
    content = buildMarkdown(meeting, notes, todos);
  } else {
    const segments = await getTranscript(id);
    content = format === "srt" ? buildSrt(segments) : buildTxt(segments);
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${slugify(meeting.title)}.${format}"`,
    },
  });
}

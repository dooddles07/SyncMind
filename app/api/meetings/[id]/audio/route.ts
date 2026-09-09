import { NextResponse } from "next/server";
import { createClient } from "@/server/config/supabase-server";
import { getPlayableChunksForMeeting } from "@/server/models/audio-chunk-model";
import { getMeetingById } from "@/server/models/meeting-model";

const SIGNED_URL_TTL_SEC = 60 * 60;

/**
 * Signed playback URLs for a meeting's audio. The "recordings" bucket is private
 * and stays private -- the browser gets short-lived signed URLs, one per chunk,
 * and never a public object. RLS on both the meetings table and the storage
 * objects means another user's id here reads as "not found", not as a leak.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in required." } }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await getMeetingById(supabase, id);
  if (!meeting) {
    return NextResponse.json({ error: { code: "not_found", message: "Meeting not found." } }, { status: 404 });
  }
  if (meeting.audio_purged_at) {
    return NextResponse.json(
      { error: { code: "audio_purged", message: "This meeting's audio has been deleted." } },
      { status: 410 },
    );
  }

  const chunks = await getPlayableChunksForMeeting(supabase, id);
  if (chunks.length === 0) {
    return NextResponse.json({ chunks: [] });
  }

  const { data: signed, error } = await supabase.storage
    .from("recordings")
    .createSignedUrls(
      chunks.map((chunk) => chunk.storage_path),
      SIGNED_URL_TTL_SEC,
    );
  if (error) {
    return NextResponse.json(
      { error: { code: "sign_failed", message: "Could not open the audio for playback." } },
      { status: 500 },
    );
  }

  // createSignedUrls answers per path, and a chunk whose object is missing comes
  // back with its own error rather than failing the whole batch -- drop those
  // instead of handing the player a null src.
  const byPath = new Map(signed.map((row) => [row.path, row.signedUrl]));

  return NextResponse.json({
    chunks: chunks
      .map((chunk) => ({
        index: chunk.chunk_index,
        startSec: chunk.start_sec,
        durationSec: chunk.duration_sec,
        url: byPath.get(chunk.storage_path) ?? null,
      }))
      .filter((chunk) => chunk.url !== null),
  });
}

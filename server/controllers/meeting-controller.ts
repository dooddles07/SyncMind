import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";
import { getStoragePathsForMeeting } from "@/server/models/audio-chunk-model";
import {
  insertAudioChunks,
  insertMeeting,
  markAllChunksUploaded,
  updateMeetingStatus,
} from "@/server/models/meeting-model";
import { HttpError } from "@/server/utils/http-error";

const MAX_DURATION_SEC = 7200;
const MAX_CHUNKS = 24;

interface ChunkInput {
  index: number;
  startSec: number;
  durationSec: number;
}

export interface CreateMeetingInput {
  title: string;
  durationSec: number;
  chunks: ChunkInput[];
}

export interface CreateMeetingResult {
  meetingId: string;
  chunks: { index: number; path: string; token: string }[];
}

export async function createMeeting(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateMeetingInput,
): Promise<CreateMeetingResult> {
  if (!input.title?.trim()) {
    throw new HttpError(400, "A title is required.");
  }
  if (!input.durationSec || input.durationSec <= 0 || input.durationSec > MAX_DURATION_SEC) {
    throw new HttpError(400, "Recordings must be under 2 hours.");
  }
  if (!input.chunks?.length || input.chunks.length > MAX_CHUNKS) {
    throw new HttpError(400, "Unexpected chunk count.");
  }

  const meeting = await insertMeeting(supabase, {
    user_id: userId,
    title: input.title.trim(),
    duration_sec: Math.round(input.durationSec),
    chunk_count: input.chunks.length,
    status: "uploading",
  });

  const signed = await Promise.all(
    input.chunks.map(async (chunk) => {
      const path = `${userId}/${meeting.id}/${chunk.index}.webm`;
      const { data, error } = await supabase.storage.from("recordings").createSignedUploadUrl(path);
      if (error) throw new HttpError(500, `Could not prepare upload slot ${chunk.index}: ${error.message}`);
      return { ...chunk, path, token: data.token };
    }),
  );

  await insertAudioChunks(
    supabase,
    signed.map((s) => ({
      meeting_id: meeting.id,
      user_id: userId,
      chunk_index: s.index,
      start_sec: Math.round(s.startSec),
      duration_sec: Math.round(s.durationSec),
      storage_path: s.path,
    })),
  );

  return {
    meetingId: meeting.id,
    chunks: signed.map(({ index, path, token }) => ({ index, path, token })),
  };
}

/** Called once every chunk has actually finished uploading -- flips the meeting from
 *  "uploading" to "transcribing" (docs/ARCHITECTURE.md's documented state machine)
 *  and marks every chunk uploaded in the same call. No transcription actually starts
 *  here; that's /api/pipeline/advance, which doesn't exist yet (M2). */
export async function finalizeUpload(supabase: SupabaseClient<Database>, meetingId: string): Promise<void> {
  await markAllChunksUploaded(supabase, meetingId);
  await updateMeetingStatus(supabase, meetingId, "transcribing");
}

/** Hard delete (docs/ARCHITECTURE.md section 5): storage objects first, then the
 *  meetings row -- every child table already references meetings(id) on delete
 *  cascade, so the row delete alone clears transcript_segments, summaries,
 *  action_items, email_drafts, share_links, and ask_queries. Session-scoped
 *  client: the "own rows" RLS policy on meetings is what actually enforces the
 *  caller can only delete their own meeting, not a check this function performs
 *  itself. */
export async function deleteMeeting(supabase: SupabaseClient<Database>, meetingId: string): Promise<void> {
  const paths = await getStoragePathsForMeeting(supabase, meetingId);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("recordings").remove(paths);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);
  if (error) throw error;
}

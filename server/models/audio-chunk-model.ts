import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type AudioChunkRow = Database["public"]["Tables"]["audio_chunks"]["Row"];

/**
 * Claims the lowest-index chunk ready to transcribe for a meeting via a conditional
 * update (status must still be "uploaded" at write time). chunk_status has 5 values
 * (supabase/migrations, enums.sql): "pending" means not yet uploaded -- set at
 * meeting creation, cleared by finalizeUpload once every signed-URL PUT succeeds,
 * which is what flips it to "uploaded". Transcription's job starts from "uploaded",
 * never "pending" -- an earlier version of this function queried "pending" here,
 * found nothing (every real chunk is already "uploaded" by the time transcription
 * can run), and silently treated "no work found" as "everything's done", skipping
 * transcription entirely. Caught via direct DB verification, not assumed correct
 * from the UI alone.
 *
 * If a concurrent advance call wins the race, this returns null -- the documented
 * behavior for advisory-lock contention (docs/ARCHITECTURE.md section 7: "return
 * current state with 200, not an error") without needing a real Postgres advisory
 * lock for this first pass.
 */
export async function claimNextChunkToTranscribe(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<AudioChunkRow | null> {
  const { data: candidate, error: selectError } = await supabase
    .from("audio_chunks")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("status", "uploaded")
    .order("chunk_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!candidate) return null;

  const { data: claimed, error: updateError } = await supabase
    .from("audio_chunks")
    .update({ status: "processing" })
    .eq("id", candidate.id)
    .eq("status", "uploaded")
    .select("*")
    .maybeSingle();
  if (updateError) throw updateError;
  return claimed;
}

export async function markChunkDone(supabase: SupabaseClient<Database>, chunkId: string): Promise<void> {
  const { error } = await supabase.from("audio_chunks").update({ status: "done" }).eq("id", chunkId);
  if (error) throw error;
}

/** Only ever called on a chunk this caller already holds an exclusive "processing"
 *  claim on, so a plain read-then-write for the attempt count is safe -- no second
 *  writer can be touching this row at the same time. */
export async function markChunkFailed(
  supabase: SupabaseClient<Database>,
  chunkId: string,
  errorMessage: string,
): Promise<{ attempts: number }> {
  const { data: current, error: readError } = await supabase
    .from("audio_chunks")
    .select("attempts")
    .eq("id", chunkId)
    .single();
  if (readError) throw readError;

  const attempts = current.attempts + 1;
  const { error } = await supabase
    .from("audio_chunks")
    .update({ status: "failed", attempts, last_error: errorMessage })
    .eq("id", chunkId);
  if (error) throw error;
  return { attempts };
}

/** Puts a claimed chunk back to "uploaded" -- used when quota blocks the call after
 *  the chunk was already claimed, so a later advance (after the quota resets) picks
 *  it up again instead of leaving it stuck in "processing" forever. */
export async function releaseChunk(supabase: SupabaseClient<Database>, chunkId: string): Promise<void> {
  const { error } = await supabase.from("audio_chunks").update({ status: "uploaded" }).eq("id", chunkId);
  if (error) throw error;
}

export async function hasChunksAwaitingTranscription(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("audio_chunks")
    .select("*", { count: "exact", head: true })
    .eq("meeting_id", meetingId)
    .in("status", ["uploaded", "processing"]);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Every storage path across every meeting a user has -- account deletion needs
 *  to clear all of it in one pass, not loop meeting by meeting. audio_chunks
 *  carries user_id directly (not just via a meeting_id join), so this is one
 *  query. */
export async function getAllStoragePathsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.from("audio_chunks").select("storage_path").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.storage_path);
}

/** All chunks regardless of status -- audio purge needs every real object that
 *  might exist in Storage for this meeting, not just the successfully-transcribed
 *  ones. */
export async function getStoragePathsForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<string[]> {
  const { data, error } = await supabase.from("audio_chunks").select("storage_path").eq("meeting_id", meetingId);
  if (error) throw error;
  return data.map((row) => row.storage_path);
}

export async function countDoneChunks(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("audio_chunks")
    .select("*", { count: "exact", head: true })
    .eq("meeting_id", meetingId)
    .eq("status", "done");
  if (error) throw error;
  return count ?? 0;
}

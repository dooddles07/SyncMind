import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
export type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
export type AudioChunkInsert = Database["public"]["Tables"]["audio_chunks"]["Insert"];
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];

// RLS ("own rows", docs/DATA-MODEL.md section 4) scopes every query here to the
// caller's own user_id automatically -- these never filter by user_id explicitly.

export async function insertMeeting(
  supabase: SupabaseClient<Database>,
  meeting: MeetingInsert,
): Promise<MeetingRow> {
  const { data, error } = await supabase.from("meetings").insert(meeting).select().single();
  if (error) throw error;
  return data;
}

export async function insertAudioChunks(
  supabase: SupabaseClient<Database>,
  chunks: AudioChunkInsert[],
): Promise<void> {
  const { error } = await supabase.from("audio_chunks").insert(chunks);
  if (error) throw error;
}

export async function getMeetingsForUser(supabase: SupabaseClient<Database>): Promise<MeetingRow[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMeetingById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<MeetingRow | null> {
  const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMeetingStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: MeetingStatus,
): Promise<void> {
  const { error } = await supabase.from("meetings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function markMeetingFailed(
  supabase: SupabaseClient<Database>,
  id: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({ status: "failed", error_code: errorCode, error_message: errorMessage })
    .eq("id", id);
  if (error) throw error;
}

/** Retry entry point: resumes a "failed" meeting to a real working status and
 *  clears the stale error so it doesn't linger once work resumes. */
export async function retryMeetingStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: MeetingStatus,
): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({ status, error_code: null, error_message: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markMeetingQuotaBlocked(
  supabase: SupabaseClient<Database>,
  id: string,
  resumeAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({ status: "quota_blocked", resume_at: resumeAt })
    .eq("id", id);
  if (error) throw error;
}

/** Sweep-only exception to this file's "RLS scopes everything" rule: the sweep
 *  cron has no user session to be scoped by, and by design needs to see every
 *  user's stalled meetings, not just one -- always called with the admin client.
 *  A meeting qualifies if it's actively working but hasn't been touched in
 *  `staleBefore` (chunk-level or Groq-level failures that never reach a terminal
 *  status), or if it's quota_blocked and resume_at has already passed. */
export async function getMeetingsNeedingAdvance(
  supabase: SupabaseClient<Database>,
  staleBefore: string,
): Promise<MeetingRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .or(
      `and(status.eq.transcribing,updated_at.lt.${staleBefore}),` +
        `and(status.eq.analyzing,updated_at.lt.${staleBefore}),` +
        `and(status.eq.quota_blocked,resume_at.lte.${now})`,
    );
  if (error) throw error;
  return data;
}

/** Sweep-only, admin client -- see getMeetingsNeedingAdvance. Candidates for audio
 *  purge: terminal, not pinned, not already purged. Retention is per-user
 *  (profiles.retention_days), so the actual age check happens in the caller after
 *  this embedded-select join. */
export async function getPurgeCandidateMeetings(
  supabase: SupabaseClient<Database>,
): Promise<(MeetingRow & { profiles: { retention_days: number } | null })[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, profiles(retention_days)")
    .in("status", ["ready", "failed"])
    .eq("pinned", false)
    .is("audio_purged_at", null);
  if (error) throw error;
  return data;
}

export async function markAudioPurged(supabase: SupabaseClient<Database>, meetingId: string): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({ audio_purged_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) throw error;
}

/** All-or-nothing for this pass: the client only calls this once every signed-URL
 *  PUT has already succeeded, so "uploaded" is a true statement about every chunk
 *  at once, not a partial/incremental status. Live per-chunk progress during the
 *  upload itself is shown client-side, not read back from the DB (no poll loop
 *  exists yet -- that's M2). */
export async function markAllChunksUploaded(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("audio_chunks")
    .update({ status: "uploaded" })
    .eq("meeting_id", meetingId);
  if (error) throw error;
}

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

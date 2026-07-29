import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

export type TranscriptSegmentRow = Database["public"]["Tables"]["transcript_segments"]["Row"];

export async function getSegmentsForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<TranscriptSegmentRow[]> {
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return data;
}

/** Speaker labels aren't a table of their own -- they're the distinct `speaker`
 *  values already stored on each segment. Empty for a meeting with no transcript
 *  yet, which is real, not a fallback. */
export async function getSpeakerLabelsForMeeting(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("speaker")
    .eq("meeting_id", meetingId)
    .not("speaker", "is", null);
  if (error) throw error;
  return [...new Set(data.map((row) => row.speaker).filter((s): s is string => s !== null))];
}

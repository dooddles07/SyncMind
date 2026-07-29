import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";
import type { StitchedSegment } from "@/server/utils/transcript-stitch";

export type TranscriptSegmentRow = Database["public"]["Tables"]["transcript_segments"]["Row"];
type TranscriptSegmentInsert = Database["public"]["Tables"]["transcript_segments"]["Insert"];

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

/** Absolute end_sec of the meeting's last stored segment -- what shiftAndDedupe
 *  needs to know how much of the next chunk's overlap window is already covered.
 *  null for the meeting's first chunk. */
export async function getLastStoredEndSec(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("end_sec")
    .eq("meeting_id", meetingId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.end_sec ?? null;
}

/** Last ~200 characters of the meeting's transcript so far -- Whisper's carryover
 *  prompt (docs/AI-PIPELINE.md section 2), improves continuity across the seam. */
export async function getCarryoverPrompt(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("text")
    .eq("meeting_id", meetingId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.text.slice(-200);
}

export async function insertStitchedSegments(
  supabase: SupabaseClient<Database>,
  args: { meetingId: string; userId: string; chunkIndex: number; segments: StitchedSegment[] },
): Promise<void> {
  if (args.segments.length === 0) return;

  const { data: maxRow, error: maxError } = await supabase
    .from("transcript_segments")
    .select("seq")
    .eq("meeting_id", args.meetingId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw maxError;
  const startSeq = (maxRow?.seq ?? 0) + 1;

  const rows: TranscriptSegmentInsert[] = args.segments.map((s, i) => ({
    meeting_id: args.meetingId,
    user_id: args.userId,
    chunk_index: args.chunkIndex,
    seq: startSeq + i,
    start_sec: s.startSec,
    end_sec: s.endSec,
    text: s.text,
  }));

  const { error } = await supabase.from("transcript_segments").insert(rows);
  if (error) throw error;
}

/** Applies the analysis pass's inferred speaker ranges to every segment falling
 *  inside each range. Best-effort: a range with no matching segments is a no-op,
 *  not an error. */
export async function applySpeakerRanges(
  supabase: SupabaseClient<Database>,
  meetingId: string,
  ranges: { fromSec: number; toSec: number; speakerLabel: string }[],
): Promise<void> {
  for (const range of ranges) {
    const { error } = await supabase
      .from("transcript_segments")
      .update({ speaker: range.speakerLabel })
      .eq("meeting_id", meetingId)
      .gte("start_sec", range.fromSec)
      .lt("start_sec", range.toSec);
    if (error) throw error;
  }
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

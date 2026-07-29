// Real sweep cron (docs/ARCHITECTURE.md section 5: "POST /api/cron/sweep ...
// Advances stalled meetings and purges expired audio"). Always called with the
// admin client -- the cron job has no user session, by design.
import type { SupabaseClient } from "@supabase/supabase-js";
import { advance } from "@/server/controllers/pipeline-controller";
import type { Database } from "@/server/models/database.types";
import { getStoragePathsForMeeting } from "@/server/models/audio-chunk-model";
import {
  getMeetingsNeedingAdvance,
  getPurgeCandidateMeetings,
  markAudioPurged,
} from "@/server/models/meeting-model";

const STALE_MINUTES = 10;
const MAX_ADVANCE_ITERATIONS = 10;
const DEFAULT_RETENTION_DAYS = 7;

/** One meeting can need several real units of work to actually recover (e.g. a
 *  quota-blocked meeting resumes into "transcribing", which then still has real
 *  chunks left to transcribe) -- loops advance() up to a small bound per meeting
 *  rather than doing exactly one flip and waiting for tomorrow's sweep. Each
 *  individual advance() call is exactly as constrained as it already is; this
 *  loop just means the daily GitHub Actions runtime (not Vercel's per-request
 *  cap) absorbs the extra calls. */
export async function advanceStalledMeetings(supabase: SupabaseClient<Database>): Promise<{ advanced: number }> {
  const staleBefore = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
  const meetings = await getMeetingsNeedingAdvance(supabase, staleBefore);

  for (const meeting of meetings) {
    for (let i = 0; i < MAX_ADVANCE_ITERATIONS; i++) {
      const result = await advance(supabase, meeting.id);
      if (result.status !== "transcribing" && result.status !== "analyzing") break;
    }
  }

  return { advanced: meetings.length };
}

export async function purgeExpiredAudio(supabase: SupabaseClient<Database>): Promise<{ purged: number }> {
  const candidates = await getPurgeCandidateMeetings(supabase);
  let purged = 0;

  for (const meeting of candidates) {
    const retentionDays = meeting.profiles?.retention_days ?? DEFAULT_RETENTION_DAYS;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const ageMs = Date.now() - new Date(meeting.created_at).getTime();
    if (ageMs <= retentionMs) continue;

    const paths = await getStoragePathsForMeeting(supabase, meeting.id);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from("recordings").remove(paths);
      if (error) throw error;
    }
    await markAudioPurged(supabase, meeting.id);
    purged++;
  }

  return { purged };
}

export async function runSweep(
  supabase: SupabaseClient<Database>,
): Promise<{ advanced: number; purged: number }> {
  const [{ advanced }, { purged }] = await Promise.all([
    advanceStalledMeetings(supabase),
    purgeExpiredAudio(supabase),
  ]);
  return { advanced, purged };
}

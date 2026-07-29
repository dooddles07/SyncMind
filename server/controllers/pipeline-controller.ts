import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndReserve, recordUsage } from "@/lib/quota";
import { GroqRateLimitError, transcribeChunk } from "@/server/config/groq";
import {
  claimNextChunkToTranscribe,
  countDoneChunks,
  hasChunksAwaitingTranscription,
  markChunkDone,
  markChunkFailed,
  releaseChunk,
} from "@/server/models/audio-chunk-model";
import type { Database } from "@/server/models/database.types";
import {
  getMeetingById,
  markMeetingFailed,
  markMeetingQuotaBlocked,
  updateMeetingStatus,
} from "@/server/models/meeting-model";
import {
  getCarryoverPrompt,
  getLastStoredEndSec,
  insertStitchedSegments,
} from "@/server/models/transcript-model";
import { shiftAndDedupe } from "@/server/utils/transcript-stitch";
import { HttpError } from "@/server/utils/http-error";

export interface PipelineStatus {
  status: string;
  stageDetail: string | null;
  chunksDone: number;
  chunksTotal: number;
  error: string | null;
}

/** Also the poll target's controller (GET /api/meetings/:id/status) -- same shape
 *  advance() returns, per docs/ARCHITECTURE.md section 5. */
export async function currentStatus(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<PipelineStatus> {
  const meeting = await getMeetingById(supabase, meetingId);
  if (!meeting) throw new HttpError(404, "Meeting not found.");
  const chunksDone = await countDoneChunks(supabase, meetingId);
  return {
    status: meeting.status,
    stageDetail: meeting.stage_detail,
    chunksDone,
    chunksTotal: meeting.chunk_count,
    error: meeting.error_message,
  };
}

/**
 * Does exactly one unit of work and returns, per docs/ARCHITECTURE.md section 3.3 --
 * transcribe one pending chunk, or flip to "analyzing" once none are left. Idempotent:
 * calling this on a meeting that isn't "transcribing" is a safe no-op that just
 * reports the current state, and losing the chunk-claim race to a concurrent call
 * (docs/ARCHITECTURE.md section 7: "advisory lock contention -> return current state,
 * not an error") behaves the same way.
 */
export async function advance(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<PipelineStatus> {
  const meeting = await getMeetingById(supabase, meetingId);
  if (!meeting) throw new HttpError(404, "Meeting not found.");

  if (meeting.status !== "transcribing") {
    return currentStatus(supabase, meetingId);
  }

  const chunk = await claimNextChunkToTranscribe(supabase, meetingId);

  if (!chunk) {
    if (await hasChunksAwaitingTranscription(supabase, meetingId)) {
      // Lost the claim race this time -- someone else (or a retrying client) is
      // already handling the remaining work. Not an error.
      return currentStatus(supabase, meetingId);
    }
    // Every chunk is done. Nothing exists yet to actually analyze the transcript
    // (M3), so this is where the meeting honestly stops -- a real state the UI
    // already renders, not a stall this pipeline is responsible for fixing.
    await updateMeetingStatus(supabase, meetingId, "analyzing");
    return {
      status: "analyzing",
      stageDetail: "Picking out the important bits",
      chunksDone: meeting.chunk_count,
      chunksTotal: meeting.chunk_count,
      error: null,
    };
  }

  const quota = await checkAndReserve(supabase, meeting.user_id, {
    audioSeconds: chunk.duration_sec,
  });
  if (!quota.ok) {
    await releaseChunk(supabase, chunk.id);
    await markMeetingQuotaBlocked(supabase, meetingId, quota.resumeAt);
    return {
      status: "quota_blocked",
      stageDetail: `Paused until ${quota.resumeAt}`,
      chunksDone: 0,
      chunksTotal: meeting.chunk_count,
      error: null,
    };
  }

  try {
    const [previousEndSec, prompt, { data: audioBlob, error: downloadError }] = await Promise.all([
      getLastStoredEndSec(supabase, meetingId),
      getCarryoverPrompt(supabase, meetingId),
      supabase.storage.from("recordings").download(chunk.storage_path),
    ]);
    if (downloadError || !audioBlob) {
      throw new Error(`Could not read the uploaded audio: ${downloadError?.message ?? "not found"}`);
    }

    const segments = await transcribeChunk(audioBlob, { language: meeting.language, prompt });
    const stitched = shiftAndDedupe(segments, chunk.start_sec, previousEndSec);
    await insertStitchedSegments(supabase, {
      meetingId,
      userId: meeting.user_id,
      chunkIndex: chunk.chunk_index,
      segments: stitched,
    });
    await markChunkDone(supabase, chunk.id);
    await recordUsage(supabase, { audioSeconds: chunk.duration_sec });
  } catch (err) {
    if (err instanceof GroqRateLimitError) {
      await releaseChunk(supabase, chunk.id);
      const resumeAt = new Date(Date.now() + err.retryAfterSec * 1000).toISOString();
      await markMeetingQuotaBlocked(supabase, meetingId, resumeAt);
      return {
        status: "quota_blocked",
        stageDetail: `Paused until ${resumeAt}`,
        chunksDone: 0,
        chunksTotal: meeting.chunk_count,
        error: null,
      };
    }

    // transcribeChunk already exhausted its own 3-attempt retry ladder before
    // throwing (server/config/groq.ts), so any other error here is the
    // "after 3, mark the chunk failed" case, not a first failure to retry later.
    const message = err instanceof Error ? err.message : "Transcription failed.";
    await markChunkFailed(supabase, chunk.id, message);
    await markMeetingFailed(
      supabase,
      meetingId,
      "TRANSCRIBE_FAILED",
      "Part of the audio did not come through.",
    );
    return {
      status: "failed",
      stageDetail: null,
      chunksDone: 0,
      chunksTotal: meeting.chunk_count,
      error: "Part of the audio did not come through.",
    };
  }

  return currentStatus(supabase, meetingId);
}

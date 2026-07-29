import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndReserve, recordUsage } from "@/lib/quota";
import { AnalysisTooLongError, analyzeMeeting } from "@/server/controllers/analysis-controller";
import { draftEmail } from "@/server/controllers/email-controller";
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
import { getEmailDraftForMeeting } from "@/server/models/email-draft-model";
import {
  getMeetingById,
  markMeetingFailed,
  markMeetingQuotaBlocked,
  updateMeetingStatus,
  type MeetingRow,
} from "@/server/models/meeting-model";
import { getProfile } from "@/server/models/profile-model";
import { getSummaryForMeeting } from "@/server/models/summary-model";
import {
  getCarryoverPrompt,
  getLastStoredEndSec,
  insertStitchedSegments,
} from "@/server/models/transcript-model";
import { HttpError } from "@/server/utils/http-error";
import { QuotaBlockedError } from "@/server/utils/pipeline-errors";
import { shiftAndDedupe } from "@/server/utils/transcript-stitch";

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

function quotaBlockedStatus(meeting: MeetingRow, resumeAt: string): PipelineStatus {
  return {
    status: "quota_blocked",
    stageDetail: `Paused until ${resumeAt}`,
    chunksDone: meeting.chunk_count,
    chunksTotal: meeting.chunk_count,
    error: null,
  };
}

function failedStatus(meeting: MeetingRow, message: string): PipelineStatus {
  return {
    status: "failed",
    stageDetail: null,
    chunksDone: meeting.chunk_count,
    chunksTotal: meeting.chunk_count,
    error: message,
  };
}

/**
 * Does exactly one unit of work and returns, per docs/ARCHITECTURE.md section 3.3 --
 * transcribe one pending chunk, flip to "analyzing" once none are left, (for an
 * "analyzing" meeting) run whichever of the analysis / email-draft sub-steps hasn't
 * happened yet, or (for a "quota_blocked" meeting whose resume_at has passed) flip
 * back to whichever real status picks up where it left off -- docs/ARCHITECTURE.md's
 * state diagram documents `quota_blocked --> transcribing: quota window resets`, and
 * the same resume logic covers a block that happened during analysis or the email
 * step too. Idempotent: calling this on a meeting that's none of the above is a safe
 * no-op that just reports the current state; losing the chunk-claim race to a
 * concurrent call (docs/ARCHITECTURE.md section 7: "advisory lock contention ->
 * return current state, not an error") and re-advancing an already-"ready" meeting
 * both behave the same way.
 */
export async function advance(
  supabase: SupabaseClient<Database>,
  meetingId: string,
): Promise<PipelineStatus> {
  const meeting = await getMeetingById(supabase, meetingId);
  if (!meeting) throw new HttpError(404, "Meeting not found.");

  if (meeting.status === "analyzing") {
    return advanceAnalysis(supabase, meeting);
  }

  if (meeting.status === "quota_blocked") {
    return advanceQuotaBlocked(supabase, meeting);
  }

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
    // Every chunk is done -- move on to analysis, picked up by the next advance().
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
    await recordUsage(supabase, { audioSeconds: chunk.duration_sec }, meeting.user_id);
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

/**
 * One unit of work for a "quota_blocked" meeting: if resume_at is still in the
 * future, a no-op that just reports current state (same shape as every other
 * idempotent branch). Once it's passed, flips status to "transcribing" if chunks
 * are still awaiting transcription, or "analyzing" otherwise -- advanceAnalysis
 * already re-derives analysis-vs-email-step from real data, so "analyzing" is the
 * correct resume target whether the block happened during analysis or the email
 * step. The actual resumed work happens on the *next* advance() call, consistent
 * with "exactly one unit of work per call".
 */
async function advanceQuotaBlocked(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
): Promise<PipelineStatus> {
  if (!meeting.resume_at || new Date(meeting.resume_at) > new Date()) {
    return currentStatus(supabase, meeting.id);
  }

  const nextStatus = (await hasChunksAwaitingTranscription(supabase, meeting.id))
    ? "transcribing"
    : "analyzing";
  await updateMeetingStatus(supabase, meeting.id, nextStatus);
  return currentStatus(supabase, meeting.id);
}

/**
 * "analyzing" covers two ordered sub-steps -- minutes/actions, then the email draft
 * -- each its own real unit of work. Idempotent on both: a meeting with a
 * `summaries` row skips straight to the email step, and one with both rows just
 * makes sure `meetings.status` reflects "ready" (a safety net for a re-triggered
 * call after the real transition already happened).
 */
async function advanceAnalysis(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
): Promise<PipelineStatus> {
  const summary = await getSummaryForMeeting(supabase, meeting.id);
  if (!summary) {
    return runAnalysisStep(supabase, meeting);
  }

  const emailDraft = await getEmailDraftForMeeting(supabase, meeting.id);
  if (!emailDraft) {
    return runEmailStep(supabase, meeting);
  }

  if (meeting.status !== "ready") {
    await updateMeetingStatus(supabase, meeting.id, "ready");
  }
  return currentStatus(supabase, meeting.id);
}

async function runAnalysisStep(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
): Promise<PipelineStatus> {
  try {
    await analyzeMeeting(supabase, meeting);
  } catch (err) {
    if (err instanceof QuotaBlockedError) {
      await markMeetingQuotaBlocked(supabase, meeting.id, err.resumeAt);
      return quotaBlockedStatus(meeting, err.resumeAt);
    }
    if (err instanceof GroqRateLimitError) {
      const resumeAt = new Date(Date.now() + err.retryAfterSec * 1000).toISOString();
      await markMeetingQuotaBlocked(supabase, meeting.id, resumeAt);
      return quotaBlockedStatus(meeting, resumeAt);
    }
    if (err instanceof AnalysisTooLongError) {
      const message = "This meeting is too long to analyze yet.";
      await markMeetingFailed(supabase, meeting.id, "ANALYZE_TOO_LONG", message);
      return failedStatus(meeting, message);
    }

    // structured-output.ts already exhausted its own repair attempt before
    // throwing, so any other error here is the documented ANALYZE_INVALID_OUTPUT
    // case (docs/AI-PIPELINE.md section 5), not a first failure to retry later.
    const message = "Could not make sense of this meeting.";
    await markMeetingFailed(supabase, meeting.id, "ANALYZE_INVALID_OUTPUT", message);
    return failedStatus(meeting, message);
  }

  return currentStatus(supabase, meeting.id);
}

async function runEmailStep(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
): Promise<PipelineStatus> {
  try {
    const profile = await getProfile(supabase, meeting.user_id);
    await draftEmail(supabase, meeting, profile?.default_tone ?? "professional");
    await updateMeetingStatus(supabase, meeting.id, "ready");
  } catch (err) {
    if (err instanceof QuotaBlockedError) {
      await markMeetingQuotaBlocked(supabase, meeting.id, err.resumeAt);
      return quotaBlockedStatus(meeting, err.resumeAt);
    }
    if (err instanceof GroqRateLimitError) {
      const resumeAt = new Date(Date.now() + err.retryAfterSec * 1000).toISOString();
      await markMeetingQuotaBlocked(supabase, meeting.id, resumeAt);
      return quotaBlockedStatus(meeting, resumeAt);
    }

    const message = "Could not draft a follow-up email for this meeting.";
    await markMeetingFailed(supabase, meeting.id, "EMAIL_INVALID_OUTPUT", message);
    return failedStatus(meeting, message);
  }

  return currentStatus(supabase, meeting.id);
}

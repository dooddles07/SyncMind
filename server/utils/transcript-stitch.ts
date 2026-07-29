// Pure arithmetic, no Supabase import -- unit-tested with synthetic fixtures per
// docs/AI-PIPELINE.md section 2, no model call needed to verify it.

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface StitchedSegment {
  startSec: number;
  endSec: number;
  text: string;
}

/**
 * Shifts a chunk's Whisper segments (chunk-relative) to meeting-absolute time, then
 * drops whatever the 3-second chunk overlap already captured in the previous chunk.
 *
 * - Every segment is shifted by `chunkStartSec`.
 * - A segment entirely within the already-covered region (its shifted end is at or
 *   before `previousChunkEndSec`) is dropped -- pure duplicate.
 * - A segment straddling the seam is kept only if more than half its duration lies
 *   past `previousChunkEndSec`; otherwise it's mostly a repeat of what the previous
 *   chunk already produced.
 * - `previousChunkEndSec` of `null` means this is the meeting's first chunk -- keep
 *   everything.
 */
export function shiftAndDedupe(
  segments: WhisperSegment[],
  chunkStartSec: number,
  previousChunkEndSec: number | null,
): StitchedSegment[] {
  const shifted = segments.map((s) => ({
    startSec: s.start + chunkStartSec,
    endSec: s.end + chunkStartSec,
    text: s.text,
  }));

  if (previousChunkEndSec === null) return shifted;

  return shifted.filter((s) => {
    if (s.endSec <= previousChunkEndSec) return false;
    if (s.startSec >= previousChunkEndSec) return true;
    const overlapSec = previousChunkEndSec - s.startSec;
    const durationSec = s.endSec - s.startSec;
    return overlapSec / durationSec < 0.5;
  });
}

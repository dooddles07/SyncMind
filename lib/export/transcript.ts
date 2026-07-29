// Transcript exports, no server round-trip once the segments are in hand --
// same client-safe shape as ics.ts/gmail.ts. Used by app/api/meetings/[id]/
// export/route.ts, which supplies real segments fetched server-side first.
import { formatTimecode, type Segment } from "@/lib/types";

const FALLBACK_CUE_PADDING_SEC = 3;

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/** SubRip requires HH:MM:SS,mmm exactly -- formatTimecode's variable-width
 *  "MM:SS"/"H:MM:SS" display format isn't valid here. */
function srtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const whole = Math.floor(clamped);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const ms = Math.round((clamped - whole) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

/** One numbered cue per segment. Real `end` (transcript_segments.end_sec) is
 *  used when present; falls back to the next segment's start, or a fixed pad
 *  after the last segment's start, only when it's genuinely missing. */
export function buildSrt(segments: Segment[]): string {
  return segments
    .map((segment, i) => {
      const end = segment.end ?? segments[i + 1]?.at ?? segment.at + FALLBACK_CUE_PADDING_SEC;
      return `${i + 1}\n${srtTimestamp(segment.at)} --> ${srtTimestamp(end)}\n${segment.text}\n`;
    })
    .join("\n");
}

export function buildTxt(segments: Segment[]): string {
  return segments
    .map((segment) => {
      const speaker = segment.speakerId !== "unknown" ? `${segment.speakerId}: ` : "";
      return `[${formatTimecode(segment.at)}] ${speaker}${segment.text}`;
    })
    .join("\n");
}

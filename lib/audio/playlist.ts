/** Shared by the transcript player and its test: the recording is stored as
 *  separate chunk objects, so a position in the *whole* meeting has to be mapped
 *  back to a chunk plus an offset inside it. Chunks overlap by 3s (see
 *  lib/audio/chunker.ts), and the last chunk that has started always wins, so
 *  playing straight off the end of one chunk lands mid-way into the next instead
 *  of replaying the overlap. */
export interface PlayableChunk {
  index: number;
  startSec: number;
  durationSec: number;
  url: string;
}

export function locateChunk(
  chunks: PlayableChunk[],
  atSec: number,
): { chunk: PlayableChunk; offsetSec: number } | null {
  if (chunks.length === 0) return null;
  let found = chunks[0];
  for (const chunk of chunks) {
    if (chunk.startSec <= atSec) found = chunk;
    else break;
  }
  return { chunk: found, offsetSec: Math.max(0, atSec - found.startSec) };
}

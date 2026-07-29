// Runs entirely client-side (WASM), matching the zero-cost architecture --
// docs/ARCHITECTURE.md section 3.4. Transcodes to 16 kHz mono Opus and splits into
// ~10-minute chunks with a 3-second trailing overlap (used later to de-duplicate the
// seam between chunks during transcription, not by this module).
//
// Single-threaded @ffmpeg/core only, per the decision locked in ARCHITECTURE.md
// section 3.4 before any chunker code existed -- avoids the site-wide COOP/COEP
// header requirement the multithreaded core needs. Loaded from a CDN rather than
// self-hosted: the wasm binary is ~31 MB, too large to commit into the repo, and this
// is the pattern ffmpeg.wasm's own docs recommend for exactly that reason.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
const MAX_DURATION_SEC = 2 * 60 * 60;
const CHUNK_DURATION_SEC = 10 * 60;
const CHUNK_OVERLAP_SEC = 3;
/** Below this, a failed ffmpeg load can fall back to a direct, unchunked upload. */
const DIRECT_UPLOAD_FALLBACK_MAX_BYTES = 20 * 1024 * 1024;

export interface AudioChunk {
  index: number;
  startSec: number;
  durationSec: number;
  blob: Blob;
}

export interface ChunkResult {
  chunks: AudioChunk[];
  durationSec: number;
  mimeType: "audio/webm";
}

export class ChunkerError extends Error {
  constructor(
    message: string,
    public readonly reason: "too_long" | "load_failed" | "too_large_for_fallback",
  ) {
    super(message);
  }
}

export interface ChunkPlan {
  index: number;
  startSec: number;
  durationSec: number;
}

/**
 * Pure offset math for splitting a recording into ~10-minute chunks with a
 * 3-second trailing overlap (used later to de-duplicate the seam between
 * chunks during transcription -- see shiftAndDedupe in transcript-stitch.ts).
 * Every chunk but the last runs long by the overlap; the last chunk is
 * clipped to the real remaining duration, never padded past it.
 */
export function planChunks(durationSec: number): ChunkPlan[] {
  const chunkCount = Math.ceil(durationSec / CHUNK_DURATION_SEC);
  const plan: ChunkPlan[] = [];

  for (let index = 0; index < chunkCount; index++) {
    const startSec = index * CHUNK_DURATION_SEC;
    const isLast = index === chunkCount - 1;
    const chunkDurationSec = isLast
      ? durationSec - startSec
      : Math.min(CHUNK_DURATION_SEC + CHUNK_OVERLAP_SEC, durationSec - startSec);
    plan.push({ index, startSec, durationSec: chunkDurationSec });
  }

  return plan;
}

/** Real media duration via the browser, not ffmpeg -- simpler and doesn't need the
 *  WASM module loaded just to answer this. */
function probeDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(el.src);
      reject(new Error("Could not read this file's duration."));
    };
    el.src = URL.createObjectURL(file);
  });
}

export async function chunkAudio(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<ChunkResult> {
  const durationSec = await probeDuration(file);
  if (durationSec > MAX_DURATION_SEC) {
    throw new ChunkerError("Recordings over 2 hours aren't supported yet.", "too_long");
  }

  const ffmpeg = new FFmpeg();
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
  } catch {
    if (file.size > DIRECT_UPLOAD_FALLBACK_MAX_BYTES) {
      throw new ChunkerError(
        "Audio processing didn't load, and this file is too large to send as-is. Please compress it first.",
        "too_large_for_fallback",
      );
    }
    // No chunking available, but the file is small enough to upload whole.
    return { chunks: [{ index: 0, startSec: 0, durationSec, blob: file }], durationSec, mimeType: "audio/webm" };
  }

  ffmpeg.on("progress", ({ progress }) => onProgress?.(Math.min(progress, 1) * 0.6));

  // -vn drops any video track, so this handles audio-only and video input the same
  // way. Transcode once; chunks below are cheap stream copies off this file.
  await ffmpeg.writeFile("input", await fetchFile(file));
  await ffmpeg.exec(["-i", "input", "-vn", "-ar", "16000", "-ac", "1", "-c:a", "libopus", "full.webm"]);

  const plan = planChunks(durationSec);
  const chunks: AudioChunk[] = [];

  for (const { index, startSec, durationSec: chunkDurationSec } of plan) {
    const outName = `chunk_${index}.webm`;
    await ffmpeg.exec([
      "-ss",
      String(startSec),
      "-t",
      String(chunkDurationSec),
      "-i",
      "full.webm",
      "-c",
      "copy",
      outName,
    ]);
    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: "audio/webm" });
    chunks.push({ index, startSec, durationSec: chunkDurationSec, blob });
    onProgress?.(0.6 + 0.4 * ((index + 1) / plan.length));
  }

  return { chunks, durationSec, mimeType: "audio/webm" };
}

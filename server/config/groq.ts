// Raw fetch, not the OpenAI SDK -- Groq's API is OpenAI-compatible and a single
// endpoint doesn't earn a new dependency (CLAUDE.md: no external libraries unless
// necessary). Request shape and retry ladder are both fully specified already --
// docs/AI-PIPELINE.md section 2, docs/ARCHITECTURE.md section 7 -- nothing here is
// a new design decision, just following what's written down.
import type { WhisperSegment } from "@/server/utils/transcript-stitch";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const RETRY_BACKOFF_MS = [2000, 6000, 18000];

export class GroqRateLimitError extends Error {
  constructor(public readonly retryAfterSec: number) {
    super(`Groq rate limited, retry after ${retryAfterSec}s`);
  }
}

export class GroqTranscriptionError extends Error {}

interface TranscribeOptions {
  language: string;
  prompt?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function transcribeChunk(
  blob: Blob,
  { language, prompt }: TranscribeOptions,
): Promise<WhisperSegment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqTranscriptionError("GROQ_API_KEY is not set.");

  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    const form = new FormData();
    form.append("file", blob, "chunk.webm");
    form.append("model", WHISPER_MODEL);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    form.append("language", language);
    form.append("temperature", "0");
    if (prompt) form.append("prompt", prompt);

    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch (err) {
      // Network-level failure -- treated the same as a 5xx per the retry ladder.
      lastError = err;
      if (attempt < RETRY_BACKOFF_MS.length) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get("retry-after") ?? "60");
      if (retryAfterSec < 20 && attempt === 1) {
        // In-request retry once, per ARCHITECTURE.md section 7.
        await sleep(retryAfterSec * 1000);
        continue;
      }
      throw new GroqRateLimitError(retryAfterSec);
    }

    if (response.status >= 500) {
      lastError = new GroqTranscriptionError(`Groq ${response.status}`);
      if (attempt < RETRY_BACKOFF_MS.length) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GroqTranscriptionError(`Groq ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { segments?: WhisperSegment[] };
    return data.segments ?? [];
  }

  throw lastError instanceof Error ? lastError : new GroqTranscriptionError("Transcription failed.");
}

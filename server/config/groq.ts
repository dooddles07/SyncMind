// Raw fetch, not the OpenAI SDK -- Groq's API is OpenAI-compatible and doesn't need
// a dependency for two endpoints (CLAUDE.md: no external libraries unless
// necessary). Request shapes and the retry ladder are both fully specified already
// -- docs/AI-PIPELINE.md sections 2-3, docs/ARCHITECTURE.md section 7 -- nothing
// here is a new design decision, just following what's written down.
import type { WhisperSegment } from "@/server/utils/transcript-stitch";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const ANALYSIS_MODEL = "llama-3.3-70b-versatile";
export const ASK_MODEL = "llama-3.1-8b-instant";
const RETRY_BACKOFF_MS = [2000, 6000, 18000];

export class GroqRateLimitError extends Error {
  constructor(public readonly retryAfterSec: number) {
    super(`Groq rate limited, retry after ${retryAfterSec}s`);
  }
}

export class GroqApiError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqApiError("GROQ_API_KEY is not set.");
  return apiKey;
}

/** Shared retry ladder (docs/ARCHITECTURE.md section 7) for every Groq call: 429
 *  reads retry-after and retries once in-request if under 20s, else throws
 *  GroqRateLimitError; 5xx/network failure gets up to 3 attempts with the
 *  documented exponential backoff before surfacing. */
async function requestWithRetryLadder(makeRequest: () => Promise<Response>): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    let response: Response;
    try {
      response = await makeRequest();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_BACKOFF_MS.length) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get("retry-after") ?? "60");
      if (retryAfterSec < 20 && attempt === 1) {
        await sleep(retryAfterSec * 1000);
        continue;
      }
      throw new GroqRateLimitError(retryAfterSec);
    }

    if (response.status >= 500) {
      lastError = new GroqApiError(`Groq ${response.status}`);
      if (attempt < RETRY_BACKOFF_MS.length) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GroqApiError(`Groq ${response.status}: ${body}`);
    }

    return response;
  }

  throw lastError instanceof Error ? lastError : new GroqApiError("Groq request failed.");
}

interface TranscribeOptions {
  language: string;
  prompt?: string;
}

export async function transcribeChunk(
  blob: Blob,
  { language, prompt }: TranscribeOptions,
): Promise<WhisperSegment[]> {
  const apiKey = requireApiKey();

  const response = await requestWithRetryLadder(() => {
    const form = new FormData();
    form.append("file", blob, "chunk.webm");
    form.append("model", WHISPER_MODEL);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    form.append("language", language);
    form.append("temperature", "0");
    if (prompt) form.append("prompt", prompt);

    return fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  });

  const data = (await response.json()) as { segments?: WhisperSegment[] };
  return data.segments ?? [];
}

interface StructuredCompletionOptions {
  temperature: number;
  model?: string;
}

export interface StructuredCompletionUsage {
  totalTokens: number;
}

export interface StructuredCompletionResult {
  content: string;
  usage: StructuredCompletionUsage;
}

/** Generic JSON-mode chat completion -- reusable for analysis, email, and ask,
 *  not just one call site. Returns the raw content string; parsing/validating
 *  against a Zod schema is server/utils/structured-output.ts's job, not this
 *  client's. */
export async function runStructuredCompletion(
  systemPrompt: string,
  userPrompt: string,
  { temperature, model = ANALYSIS_MODEL }: StructuredCompletionOptions,
): Promise<StructuredCompletionResult> {
  const apiKey = requireApiKey();

  const response = await requestWithRetryLadder(() =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }),
  );

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
    usage?: { total_tokens?: number };
  };
  return {
    content: data.choices[0].message.content,
    usage: { totalTokens: data.usage?.total_tokens ?? 0 },
  };
}

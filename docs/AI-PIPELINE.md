# SyncMind — AI Pipeline

The AI layer is the product. This document specifies exactly what is sent to which model, what shape comes back, and what happens when it comes back wrong.

## 1. Models

| Role | Primary | Fallback | Why |
| --- | --- | --- | --- |
| Transcription | Groq `whisper-large-v3-turbo` | none — surface the error | Fastest free ASR with word-level timestamps; 25 MB per request |
| Minutes + actions | Groq `llama-3.3-70b-versatile` | Gemini `gemini-2.0-flash` | 70B handles structured extraction reliably; Gemini free tier covers Groq outages and daily-limit exhaustion |
| Email draft | Groq `llama-3.3-70b-versatile` | Gemini `gemini-2.0-flash` | same |
| Ask this meeting | Groq `llama-3.1-8b-instant` | Groq `llama-3.3-70b-versatile` | Q&A over a supplied transcript is retrieval-shaped, not reasoning-heavy; 8B is much cheaper against the daily call ceiling |

Model ids live in `lib/ai/models.ts` as constants, never inline at call sites, so a deprecation is a one-line change.

Fallback triggers: HTTP 429 with a reset beyond 20 seconds, HTTP 5xx after retries, or two consecutive schema-validation failures. Fallback is logged to `summaries.model` so output provenance is always recoverable.

## 2. Transcription

### Request

```ts
// lib/ai/chunk-transcribe.ts
const form = new FormData();
form.append("file", chunkBlob, `${chunkIndex}.webm`);
form.append("model", "whisper-large-v3-turbo");
form.append("response_format", "verbose_json");
form.append("timestamp_granularities[]", "segment");
form.append("language", meeting.language);        // 'en' at MVP
form.append("temperature", "0");
form.append("prompt", carryoverPrompt);            // see below
```

`carryoverPrompt` is the last ~200 characters of the previous chunk's transcript. Whisper uses it as context, which measurably improves continuity of proper nouns and jargon across a seam.

### Offset shifting and seam de-duplication

Chunks overlap by 3 seconds. For chunk *n > 0*:

1. Add `audio_chunks.start_sec` to every returned `start`/`end`.
2. Discard any segment whose shifted `end_sec` is at or before the previous chunk's last stored `end_sec` — that content was already captured in the overlap.
3. For a segment that straddles the boundary, keep it only if more than half its duration lies past the previous chunk's end.
4. Assign `seq` by continuing the meeting-wide counter.

This is pure arithmetic and is unit-tested with synthetic segment fixtures — no model call required.

### Speaker labels

Whisper does not diarize. Labels come from the analysis pass (§3), which returns a mapping from segment ranges to speaker labels. A second lightweight update writes `transcript_segments.speaker`. When the analysis reports names it heard used ("Thanks, Dan"), it maps `Speaker 2 → Dan` and the UI shows the real name with a subtle "AI-inferred" marker until the user confirms or renames.

This is deliberately labeled *diarization-lite* in the UI. It is an inference from conversational structure, not voice matching, and it should never be presented as certain.

## 3. Analysis: minutes and action items

### Context handling

`llama-3.3-70b-versatile` has a 128k context window, which comfortably fits a 2-hour transcript (~18k words ≈ 24k tokens). Single-pass is the normal path.

Map-reduce is used only when the assembled transcript exceeds **60,000 tokens** (a safety margin well under the true limit, leaving room for output):

1. **Map** — split at natural pauses into ~15,000-token windows with 500-token overlap. Run a reduced prompt on each returning only `overview`, `topics`, `decisions`, `openQuestions`, `actionItems`.
2. **Reduce** — feed the concatenated JSON of all windows into the full prompt with instruction to merge, deduplicate, and produce one coherent set.

When map-reduce runs, `summaries.model` records `llama-3.3-70b-versatile+mapreduce` and the UI notes that the meeting was analyzed in sections.

### Input format

The transcript is serialized as one line per segment, with timestamps the model can cite:

```
[00:04:12] Speaker 1: We need the vendor contract signed before the quarter closes.
[00:04:19] Speaker 2: I'll get it to legal by Friday.
```

Timestamps are `HH:MM:SS`; the prompt instructs the model to return seconds, and `lib/ai/schemas.ts` accepts either and normalizes.

### System prompt

```
You are an expert meeting analyst. You produce accurate, structured minutes from
meeting transcripts. You are precise and conservative: you record only what was
actually said.

RULES
1. Never invent facts, names, dates, or commitments. If something is unclear,
   omit it or record it under openQuestions.
2. Every decision, action item, and topic must include atSec: the timestamp in
   seconds where it appears in the transcript.
3. An action item requires a concrete commitment to do something. "We should
   think about pricing" is not an action item. "Dan will send the pricing deck
   by Thursday" is.
4. Assign owner only when the transcript makes it clear who committed. Otherwise
   set owner to null. Do not guess.
5. Resolve relative dates against MEETING_DATE, supplied below, and output
   absolute ISO dates (YYYY-MM-DD). "Friday" means the next Friday on or after
   MEETING_DATE. If a date is vague ("soon", "next sprint"), set dueDate to null.
6. Infer speaker names only when someone is addressed or introduces themselves by
   name in the transcript. Otherwise keep the generic label.
7. Write in plain, direct language. No filler, no praise, no meta-commentary
   about the transcript.
8. Output ONLY a JSON object matching the schema. No markdown fences, no prose
   before or after.
```

### User prompt

```
MEETING_TITLE: {title}
MEETING_DATE: {YYYY-MM-DD}
DURATION: {H}h {M}m
SPEAKER_LABELS_PRESENT: {Speaker 1, Speaker 2, ...}

TRANSCRIPT:
{serialized transcript}

Produce the JSON object described in the schema.
```

Groq is called with `response_format: { type: "json_object" }` and `temperature: 0.2`.

### Output schema

Validated with Zod in `lib/ai/schemas.ts`:

```ts
export const AnalysisSchema = z.object({
  overview: z.string().min(40).max(1500),
  attendees: z.array(z.object({
    speakerLabel: z.string(),
    name: z.string().nullable(),
    confidence: z.enum(["stated", "inferred"]),
  })),
  topics: z.array(z.object({
    title: z.string().max(120),
    points: z.array(z.string()).min(1).max(8),
    atSec: z.number().nonnegative(),
  })).max(12),
  decisions: z.array(z.object({
    text: z.string().max(400),
    atSec: z.number().nonnegative(),
  })).max(20),
  openQuestions: z.array(z.object({
    text: z.string().max(400),
    atSec: z.number().nonnegative(),
  })).max(15),
  actionItems: z.array(z.object({
    title: z.string().max(200),
    detail: z.string().max(600).nullable(),
    owner: z.string().max(80).nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    priority: z.enum(["low", "medium", "high"]),
    atSec: z.number().nonnegative(),
  })).max(40),
  speakerRanges: z.array(z.object({
    fromSec: z.number().nonnegative(),
    toSec: z.number().nonnegative(),
    speakerLabel: z.string(),
  })).optional(),
});
```

Post-validation checks applied in code, not by the model:

- Any `atSec` beyond `meeting.duration_sec` is clamped to the nearest real segment.
- Any `dueDate` before `meeting_date` is nulled — a past deadline is a hallucinated date.
- Action items with a title under 8 characters are dropped.
- Duplicate action items (normalized title within Levenshtein distance 3) are merged, keeping the earliest `atSec`.

## 4. Email draft

### System prompt

```
You write follow-up emails after meetings. Your emails are short, concrete, and
respectful of the reader's time.

RULES
1. Base the email only on the supplied minutes and action items. Add nothing.
2. Structure: one-sentence purpose, a short recap of what was decided, then the
   action items as a list with owner and date.
3. Do not use exclamation marks, corporate filler, or phrases like "I hope this
   email finds you well", "circle back", "touch base", "as per our discussion",
   "excited to", or "leverage".
4. Never state a deadline that is not in the supplied action items.
5. Use the sender's first name in the sign-off. Do not invent a job title or a
   company name.
6. Output ONLY JSON: { "subject": string, "bodyMarkdown": string }.

TONE: {tone}
- professional: complete sentences, neutral register, suitable for a client.
- friendly: warmer and more conversational, still concise, suitable for internal
  colleagues.
- brief: under 120 words. Recap in one or two sentences, then the action list.
```

### User prompt

```
SENDER_FIRST_NAME: {firstName}
MEETING_TITLE: {title}
MEETING_DATE: {date}

SUMMARY:
{overview}

DECISIONS:
{numbered list}

ACTION ITEMS:
{- title — owner — due date, one per line}

Write the follow-up email.
```

`temperature: 0.4` — enough variation for natural prose, low enough to stay factual.

Regeneration warns the user if `email_drafts.edited_by_user` is true, since regeneration discards manual edits.

## 5. Validation and repair

Every structured call goes through `lib/ai/structured.ts`:

```
1. Call the model with response_format json_object.
2. Strip any accidental ``` fences and leading prose. Parse.
3. Validate against the Zod schema.
4. On failure → ONE repair attempt: resend with the original prompt plus
     "Your previous output failed validation with these errors: {issues}.
      Return corrected JSON only."
5. On second failure → switch to the fallback model, full prompt, fresh attempt.
6. On third failure → throw AnalyzeInvalidOutput. Meeting goes to 'failed' with
   error_code ANALYZE_INVALID_OUTPUT and a Retry button.
```

Every attempt logs model, latency, token counts, and validation issues. No raw transcript content is logged.

## 6. Ask this meeting

Retrieval is deliberately simple — no vector database, no embedding cost, no extra service.

1. Rank segments by Postgres full-text relevance against the question (`ts_rank_cd`).
2. Take the top 25 segments, then expand each with one segment either side for context.
3. If the whole transcript is under 12,000 tokens, skip retrieval and send all of it. Most meetings qualify, and full context beats retrieval every time.

### System prompt

```
You answer questions about a single meeting using only the transcript excerpts
provided.

RULES
1. If the excerpts do not contain the answer, say exactly: "That does not appear
   in this meeting's transcript." Do not speculate.
2. Cite every claim with the timestamp in seconds from the excerpt you used.
3. Answer in at most 120 words unless the question requires a list.
4. Output ONLY JSON: { "answer": string, "citations": [{ "atSec": number }] }.
```

Answers with zero citations and a non-"not in transcript" body are rejected and retried once with the citation rule repeated. `temperature: 0.1`.

Rate limit: 20 questions per meeting per day per user, enforced by counting `ask_queries`.

## 7. Cost and quota budget

Everything below is free-tier consumption, not currency.

| Operation | Per 1-hour meeting |
| --- | --- |
| ASR requests | 6 (10-min chunks) |
| ASR audio | 3,600 seconds |
| Analysis LLM | 1 call, ~26k in / ~2.5k out |
| Email LLM | 1 call, ~1.5k in / ~0.4k out |
| Total LLM calls | 2 (plus 1 per Ask) |

Configured daily ceilings, enforced in `lib/quota.ts` before any upstream call:

| Env var | Default | Rationale |
| --- | --- | --- |
| `GROQ_DAILY_AUDIO_SECONDS` | 21600 | ~6 hours of audio per user per day |
| `GROQ_DAILY_ASR_CALLS` | 60 | ~10 meetings |
| `GROQ_DAILY_LLM_CALLS` | 80 | analysis + email + asks |
| `GROQ_DAILY_LLM_TOKENS` | 400000 | placeholder — **must be re-tuned against real limits, see below** |

**These defaults are unverified against Groq's actual current numbers and are very likely too generous.** Third-party trackers as of mid-2026 put the free tier for `llama-3.3-70b-versatile` around 1,000 requests/day and a per-minute token cap in the low tens of thousands — not officially confirmed, but if directionally correct, a single analysis call (~26k input tokens for a 1-hour meeting) could hit the per-*minute* ceiling on its own, independent of the daily total. `lib/quota.ts` as specified only tracks daily sums; it has no per-minute awareness.

Before tuning these env vars (M0/M2), pull the authoritative numbers from `console.groq.com` → Settings → Limits (per-model, logged in) and:
1. Set `GROQ_DAILY_LLM_TOKENS` to the real per-model daily figure, not a guess.
2. If a per-minute token cap exists and is anywhere near the size of one analysis call, either (a) confirm Groq queues/backs off automatically on 429 — the retry ladder in ARCHITECTURE §7 already handles this — or (b) shrink the map-reduce threshold in §3 below 60k tokens so single calls stay comfortably under the per-minute cap.
3. Log the confirmed numbers in ACTIVITY-LOG so this stops being an open item.

Exceeding a ceiling sets `meetings.status = 'quota_blocked'` with `resume_at` at the next UTC midnight. This is a product behavior with UI copy, not an exception. A burst of uploads cannot bypass this: every ASR/LLM call — not just the meeting-create step — checks projected spend against the ceiling first, so ten simultaneous uploads throttle at the same per-unit gate a single large meeting would.

## 8. Quality evaluation

A fixture set lives in `tests/fixtures/meetings/` — five short recordings with hand-written expected outputs: a standup, a client call, a decision-heavy planning session, a rambling call with no clear actions, and a poor-audio recording.

`npm run eval` runs analysis against all five and reports:

- **Action item recall** — fraction of hand-labeled actions found. Target ≥ 0.85.
- **Action item precision** — fraction of generated actions that are real. Target ≥ 0.90. Precision matters more; a false action item costs the user trust, a missed one costs them a line of typing.
- **Owner accuracy** — of actions with an owner, fraction correct. Target ≥ 0.90.
- **Date accuracy** — of actions with a due date, fraction correct. Target ≥ 0.95.
- **Hallucination check** — the no-clear-actions fixture must produce zero action items.

Run before any prompt change ships. Prompt edits are versioned in `lib/ai/prompts/` with a changelog comment at the top of each file, so a quality regression can be traced to a specific edit.

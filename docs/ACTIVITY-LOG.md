# SyncMind — Activity Log

Running record of decisions and work. Newest first. Not auto-committed.

---

## 2026-07-29 — Playwright E2E, real full-flow spec (GAP-ANALYSIS 2.9, last test gap)

**Done:** the last real doc-vs-code gap. `docs/ARCHITECTURE.md` §10 specifies
`sign-in stub → upload a 30s fixture → poll to ready → edit an action →
generate share link → verify public page. External APIs mocked at the
network layer.` — nothing existed. Full scope built, per the user's explicit
choice over two smaller options (auth-stub-only, or public-pages-only).

Two earlier attempts this session to fake an authenticated Playwright
session both failed on *how* the session was obtained (PKCE/fragment
mismatch reusing the real OAuth callback; a module-resolution issue running
a script outside the project). Neither problem was fundamental — confirmed
by reading `middleware.ts` and every Supabase client and finding they're
stock `@supabase/ssr`, no PKCE-specific logic anywhere except the callback
route itself. So the real fix was to stop going through that route:

- `server/controllers/test-auth-controller.ts` + `app/api/test/login/route.ts`
  — a test-only sign-in stub, double-gated (404s in production, 404s without
  a matching `E2E_TEST_SECRET` header). Self-provisions a seeded
  `e2e@syncmind.local` user idempotently, mints a session via the admin
  API's `generateLink` + server-side `verifyOtp` (no browser fragment
  involved — that was never the part that failed before), then calls the
  request-scoped SSR client's own `auth.setSession()` so the SDK writes
  correctly-formatted cookies itself instead of anything hand-crafted.
- `server/config/groq.ts` gained a `GROQ_BASE_URL` override (default
  unchanged, zero effect outside E2E). `tests/e2e/mock-groq-server.ts` — a
  plain Node `http` server, no new dependency, serves canned
  transcription/analysis/email responses that validate against the real
  `AnalysisSchema`/`EmailSchema`, distinguishing analysis vs. email calls by
  system-prompt substring. Zero real Groq spend per E2E run.
- `tests/e2e/fixtures/sample.wav` — a tiny (47KB) synthetically-generated
  WAV (a 3s 440Hz tone, written as raw bytes by a one-off script, not
  recorded or downloaded).
- `playwright.config.ts`: chromium only, two `webServer` entries (the mock
  Groq server, then `next dev` pointed at it), `globalSetup` signs in once
  via the stub and saves `storageState`, reused by every spec.
- `tests/e2e/full-flow.spec.ts`: real upload through real client-side
  ffmpeg.wasm chunking, polls the real `/api/meetings/:id/status` endpoint
  to `"ready"`, then a real finding — there's no inline action-item edit UI
  anywhere on the meeting page (`TodoTable` is read-only, `.ics`-download
  only); the only real edit affordance in the whole app is the `/tasks`
  board's status `<select>`. The spec uses that and says so explicitly,
  rather than silently reinterpreting the doc's "edit an action" to fit.
  Then a real share link, verified in a **fresh, unauthenticated** browser
  context against the actual public page.
- Ran twice against the live Supabase project, both passed (~50s each,
  first run surfaced the enclosing test's default 30s timeout being too
  short for a real chunk→transcribe→analyze→email pipeline — fixed by
  raising `playwright.config.ts`'s `timeout` to 150s). Verified via direct
  query afterward that the disposable meeting is fully gone (teardown reuses
  the real `deleteMeeting` controller) and the real "Introduction Video"
  meeting is untouched.
- `.github/workflows/e2e.yml` added, `pull_request` → `main` per the doc's
  stated cadence. **Cannot run in CI yet** — needs
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/
  `SUPABASE_SERVICE_ROLE_KEY`/`E2E_TEST_SECRET` added as real GitHub repo
  secrets, which only the user can do (confirmed via reading every existing
  workflow that only `CRON_SECRET` exists as a repo secret today). Flagged,
  not silently assumed to work.
- `typecheck`/`lint`/`test` (61/61)/`build` all green.
- `docs/GAP-ANALYSIS.md` 2.9 and the top-of-doc summary table (stale since
  before Vitest existed) both updated.

---

## 2026-07-29 — Real `POST /api/pipeline/retry` (GAP-ANALYSIS 1.4, last P1 item)

**Done:** closed the one remaining P1 gap. The old note claiming `advance()`
was "already safely re-callable" on a failed meeting was wrong once actually
checked — `advance()` has no branch for `status === "failed"` at all, and a
chunk stuck at `chunk_status = "failed"` is invisible to both
`claimNextChunkToTranscribe` and `hasChunksAwaitingTranscription` (they only
look at `"uploaded"`/`"processing"`). A naive status flip back to
`"transcribing"` would have silently skipped the broken chunk straight to
`"analyzing"` — a real bug that would have shipped if the old assumption
went unquestioned.

- `server/models/audio-chunk-model.ts`: `resetFailedChunksToUploaded` — puts
  `"failed"` chunks back to `"uploaded"`, leaves `attempts`/`last_error`
  alone (real history, not reset just because the user asked to retry).
- `server/models/meeting-model.ts`: `retryMeetingStatus` — status change +
  clears `error_code`/`error_message` in one write, so a stale error doesn't
  linger once work resumes.
- `server/controllers/pipeline-controller.ts`: `retryMeeting` — only allows
  retry from `status === "failed"` (409 otherwise, `RetryNotAllowedError`).
  `TRANSCRIBE_FAILED` resets the chunk(s) then resumes `"transcribing"`;
  every other failure code resumes `"analyzing"` directly, since
  `advanceAnalysis` already re-derives the right sub-step from real
  `summaries`/`email_drafts` rows. Also guards a purged-audio meeting (409,
  clear message — nothing left to re-transcribe).
- `app/api/pipeline/retry/route.ts` — same auth/thin-delegator shape as
  `/api/pipeline/advance`.
- `components/app/pipeline-poller.tsx` — real "Try again" button, shown only
  when `status === "failed"`, calls the new endpoint and resumes polling on
  success via the existing status-driven effect.
- Verified against the **live Supabase project**, not assumed: inserted a
  disposable meeting + chunk in `"failed"`/`chunk_status: "failed"`, called
  `retryMeeting` for real, confirmed the actual before/after DB rows (chunk
  `failed → uploaded`, meeting `failed → transcribing`, error fields
  cleared), confirmed a second retry attempt is correctly rejected once no
  longer `"failed"`, then deleted the disposable rows. The real
  "Introduction Video" meeting used for every other verification this
  session was untouched.
- `typecheck`/`lint`/`test` (61/61)/`build` all green.
- `docs/GAP-ANALYSIS.md` 1.4 now fully resolved — that closes out the last
  open P1 item.

---

## 2026-07-29 — Chunker offset math, real unit tests (GAP-ANALYSIS 2.9 remainder)

**Done:** `lib/audio/chunker.ts`'s chunk-boundary loop (start offsets, the
10-min chunk length, the 3s trailing overlap, last-chunk clipping) was
inline inside `chunkAudio`, which also drives the browser `<audio>` element
and ffmpeg WASM — not unit-testable as-is. Extracted the pure arithmetic to
`planChunks(durationSec): ChunkPlan[]`, same pattern as
`transcript-stitch.ts`'s `shiftAndDedupe`. `chunkAudio` now calls it instead
of duplicating the math.

- 5 real tests in `lib/audio/chunker.test.ts`: single chunk under the
  10-min length, exact-boundary case, overlap chaining across 2 and 3+
  chunks, and the edge case where a non-last chunk's remaining duration is
  less than the full overlap window (602s total — chunk 0 must clip to 602,
  not pad to 603).
- `typecheck`/`lint`/`test` (61/61)/`build` all green — confirms the
  refactor didn't change `chunkAudio`'s real behavior.
- `docs/GAP-ANALYSIS.md` 2.9 updated. Playwright E2E is the one remaining
  test gap, and it's new infra, not a quick slice.

---

## 2026-07-29 — Eval fixture set + `npm run eval` (GAP-ANALYSIS P3, last item)

**Done:** last open P3 item. `docs/AI-PIPELINE.md` §8 already specified the
shape; nothing existed yet (`tests/fixtures/`, an eval runner — confirmed
missing before starting).

- Split `server/controllers/analysis-controller.ts`: extracted
  `runAnalysisModel` (real Groq call + the same clamp/dedupe rules the live
  pipeline uses) and `estimateAnalysisTokens` (pre-call quota projection) out
  of `analyzeMeeting`, which now just does quota-check → `runAnalysisModel` →
  DB writes. No behavior change to the live pipeline — full verification
  suite green before and after.
- 5 hand-labeled fixtures in `tests/fixtures/meetings/`: standup, client
  call, decision-heavy planning (includes one deliberately-vague item that
  must NOT get a due date), rambling/no-actions (hallucination check), and a
  poor-audio one with garbled ASR-style fragments mixed into real
  commitments.
- `scripts/eval.ts` (`npm run eval`) calls `runAnalysisModel` directly
  against real Groq for all 5, matches generated vs. expected action items by
  word-overlap (not the stricter `isNearDuplicate` — real generated titles
  are rarely phrased identically to hand-written expected ones), and scores
  recall/precision/owner accuracy/date accuracy against `AI-PIPELINE.md`'s
  targets. Needed `tsx` as a new devDependency — Node's native TS runner
  doesn't resolve the `@/` tsconfig path alias the rest of the codebase uses
  throughout, confirmed by a first attempt that failed with
  `ERR_MODULE_NOT_FOUND`. Deliberately not wired into `ci.yml`/`npm test` —
  it spends real Groq tokens, meant for manual runs before a prompt change
  ships.
- Real run against live Groq: recall 1.00, owner accuracy 1.00, date
  accuracy 1.00, hallucination check PASS. Precision 0.88, just under the
  0.90 target — one extra action item on the client-call fixture; confirmed
  via a throwaway debug script that a re-run of the same fixture produced a
  different item count (2 vs 3), so this is real temp-0.2 LLM variance near
  the threshold, not a bug in the eval harness itself.
- `docs/GAP-ANALYSIS.md` P3 list is now fully resolved.

---

## 2026-07-29 — Vercel Web Analytics wired (GAP-ANALYSIS P3)

**Done:** confirmed real current Hobby free-tier limit by fetching Vercel's
own published pricing page (`vercel.com/docs/analytics/limits-and-pricing`,
last updated 2026-06-26) instead of guessing — same rigor as the Groq limits
check. Result: 50,000 events/month included on Hobby, resets each billing
cycle, no overage purchase available (collection pauses after a 3-day grace
period once exceeded).

- Installed `@vercel/analytics`, added `<Analytics />` to `app/layout.tsx`
  next to the existing `<Toaster />`. No env var needed — auto-detects the
  Vercel deployment context, no-ops locally.
- `typecheck`/`lint`/`test` (56/56)/`build` all green.
- Real event confirmation needs the live Vercel dashboard after deploy +
  real traffic — same "code ships now, external check is a later step" shape
  as the Sentry DSN item.
- GAP-ANALYSIS.md P3 list updated. One P3 item remains: eval fixture set.

---

## 2026-07-29 — real bug: Transcript tab crash, wrong error "Go home" target

**Done:** user-reported crash on production, not a planned slice. Opening the
Transcript tab on a real meeting threw the root error boundary
("Something went wrong").

- **Root cause:** three of "Introduction Video"'s real transcript segments had
  `speaker = null` (a data gap from earlier testing today, not a boundary bug
  in the labeling range as first suspected — segments 6-8 were all inside the
  applied range and should have been labeled). `getTranscript` maps a null
  speaker to `speakerId: "unknown"`, but `getSpeakers()` only returns labels
  that are actually non-null in the DB, so `"unknown"` never resolves in
  `TranscriptPanel`'s `byId` lookup — `SpeakerChip` then read `.label` off
  `undefined` and crashed. This isn't just this meeting's problem: any
  meeting viewed mid-transcription (before analysis assigns speaker labels)
  has null speakers by design and would hit the identical crash.
- **Real fix, not just this meeting's data:** `SpeakerChip` now accepts
  `Speaker | undefined` and falls back to a real "Unclear who" pseudo-speaker
  instead of assuming every id resolves — the actual root cause (unsafe
  indexing) rather than the symptom (one meeting's stale nulls).
- **Data patch:** the three real null segments corrected to `"Speaker 1"`
  directly (matches the rest of the meeting — one speaker throughout), fixing
  production immediately since it's the same Supabase project, independent of
  the code deploy.
- **Second real bug caught while fixing the first:** the root `app/error.tsx`'s
  "Go home" always links to `/` (the marketing landing page) — wrong for a
  signed-in user hitting an error inside the app. Added `app/(app)/error.tsx`,
  a route-group-scoped error boundary (Next.js resolves the closer one first),
  identical UI but "Go home" → `/dashboard`.
- Verification: `npm run typecheck`, `lint`, `test` (56 tests, unchanged),
  `build` all green.

## 2026-07-29 — real per-meeting delete

**Done:** `docs/ARCHITECTURE.md` §5's `DELETE /api/meetings/:id` — "hard
delete: storage objects, then all rows via cascade." Never built; "Delete all
my data" was the only way to remove a meeting, and that wipes the whole
account. Same cascade mechanism the account-deletion slice already relied on
(confirmed in the migrations again, not re-assumed): every child table
references `meetings(id) on delete cascade`, so deleting the row alone clears
`audio_chunks`, `transcript_segments`, `summaries`, `action_items`,
`email_drafts`, `share_links`, and `ask_queries`. Storage is the only manual
step, and `getStoragePathsForMeeting` (already built for the sweep cron) did
the lookup directly.

- `server/controllers/meeting-controller.ts` — added `deleteMeeting`, next to
  the existing `finalizeUpload`.
- `app/api/meetings/[id]/route.ts` — added `DELETE` alongside the existing
  `PATCH`.
- `components/app/delete-meeting-button.tsx` (new) — lightweight two-click
  inline confirm, deliberately not the typed-`DELETE` friction from account
  deletion (losing one meeting isn't losing everything), redirects to
  `/dashboard` on success.
- **Process note, not a code finding:** hit the same dev-mode stale-webpack-
  chunk crash on this route that's recurred all session, and asked the user
  to click through into it again before catching it myself. Fixed the actual
  habit this time instead of the individual crash: after a clean restart, now
  `curl`s the specific target page myself and confirms a real response (not
  a 500) before ever handing a link back to the user.
- **Live verification, disposable meeting (not "Introduction Video"):**
  created a throwaway meeting with a real uploaded Storage object, deleted it
  through the real UI (two-click confirm, toast, redirect to `/dashboard`,
  the real meeting still listed). Confirmed via direct Supabase queries: the
  `meetings` row is gone and the Storage object is gone.
- Verification: `npm run typecheck`, `lint`, `test` (56 tests, unchanged),
  `build` all green.

## 2026-07-29 — real to-do status persistence (TodoBoard)

**Done:** the last real gap `docs/GAP-ANALYSIS.md` 1.13 named. Re-reading it
directly: `TodoTable` (per-meeting) actually has no edit UI at all — the doc's
claim about it doesn't match the component, nothing to fix. `TodoBoard`
(`/tasks` cross-meeting kanban) was the one real gap: `useState(initial)` plus
a `move(id, status)` that updated local state on the status `<select>` and
never called anything server-side — moving a card between columns silently
did nothing past a page refresh, even though `action_items` is a fully real
table.

- `server/models/action-item-model.ts` — added `updateActionItemStatus`.
- `app/api/actions/[id]/route.ts` (`PATCH { status }`, the endpoint
  `docs/ARCHITECTURE.md` §5 already named) — maps the UI's `"doing"` to the
  DB's `"in_progress"` (reverse of the mapping `getTodos` already does the
  other way), validates against the three real enum values.
- `components/app/todo-board.tsx` — `move()` now `PATCH`es first, updates
  local state on success, toasts on failure. Same call-then-update convention
  as `EmailComposer`/`AskPanel`, not a new optimistic-update pattern.
- **Live verification, real account:** since "Introduction Video" has zero
  real to-dos (a short self-intro with no commitments — correctly, not a
  bug), inserted one disposable test to-do to actually exercise the move.
  Moved it through the real UI (todo → in progress → done), confirmed via
  direct Supabase query that `action_items.status` genuinely reached `"done"`
  — not just a local re-render. Cleaned up the disposable row afterward.
- Verification: `npm run typecheck`, `lint`, `test` (56 tests, unchanged),
  `build` all green.

## 2026-07-29 (M5.3 / F12) — real export: Markdown, PDF, transcript .txt/.srt

**Done:** `docs/PRODUCT-REQUIREMENTS.md` F12 in full except `.ics` (already
shipped, M4) — `GET /api/meetings/:id/export?format=md|srt|txt`
(`docs/ARCHITECTURE.md` §5) and a client-side print stylesheet for PDF. No
export button existed anywhere before this.

- **Real gap found while researching:** `Segment` (`lib/types.ts`) only
  carried `at` (start), not an end timestamp, even though
  `transcript_segments.end_sec` is a real column — dropped during
  `getTranscript`'s mapping since the UI only ever needed a seek-anchor. A
  real `.srt` file needs an actual per-cue `start --> end` range, not a
  fabricated one, so `Segment` gained an optional `end` and `getTranscript`
  now populates it from the real column.
- `lib/export/transcript.ts` (new) — `buildSrt` (real `end` when present,
  falls back to the next segment's start, or a fixed pad after the last
  segment, only when genuinely missing) and `buildTxt`, both pure and unit
  tested (`transcript.test.ts`) the same way `ics.ts` already is.
- `lib/export/markdown.ts` (new) — `buildMarkdown`, unit tested
  (`markdown.test.ts`). Reuses `NotesPanel`'s exact empty-state copy ("No
  decisions were made in this meeting.", etc.) so the exported file reads like
  the product, not a raw dump.
- `app/api/meetings/[id]/export/route.ts` (`GET ?format=md|srt|txt`) — normal
  session-scoped/RLS-protected route (not the public-share-page admin-client
  pattern; this is always the owner exporting their own data), returns a real
  file download with `Content-Disposition` and a real slugified filename
  (reused `slugify` from `ics.ts`).
- PDF: a dedicated `components/app/print-minutes.tsx` block (`hidden
  print:block`, plain static markup, not `NotesPanel`'s interactive citation
  buttons) always rendered alongside the interactive Tabs UI, which gets
  `print:hidden`; `app/(app)/layout.tsx`'s `<Sidebar />` also wrapped
  `print:hidden`. Tailwind v4's `print:` variant is built in, no custom
  `@media print` CSS needed.
- `components/app/export-menu.tsx` (new) — same inline-expanding-panel pattern
  as `ShareButton`/`EmailComposer` (still no dropdown/modal primitive in this
  app), placed next to `ShareButton` in the meeting page header.
- **Live verification, real account:** downloaded `introduction-video.md`
  through the actual UI (617 B, real slugified filename, real content).
  Separately verified all three formats' content directly against real data
  (bypassing the browser) — the `.srt` cues use real `end_sec` values
  (`00:00:09,160`, not a rough guess), `.txt` includes real speaker prefixes.
  Checked the browser's print preview: clean single page, real minutes
  content only, no sidebar/tabs/nav chrome.
- Verification: `npm run typecheck`, `lint`, `test` (56 tests, up from 45 --
  11 new for `buildSrt`/`buildTxt`/`buildMarkdown`), `build` all green.

## 2026-07-29 (M5 follow-on) — real usage display + retention persistence

**Done:** two real gaps on Settings, found by reading the actual components
rather than trusting the docs' framing. `RetentionSlider` was pure local
`useState` — dragging it never persisted anything, even though
`profiles.retention_days` is a real column the sweep cron's `purgeExpiredAudio`
already reads. `getUsage()` (`lib/mock/data.ts`) was still the original
`{ minutesUsed: 84, minutesLimit: 180, retentionDays: 7 }` fixture;
`docs/GAP-ANALYSIS.md` 1.9 had flagged it as deliberately mock pending
`lib/quota.ts`, but `lib/quota.ts` has been real since M2 — the doc's stated
reason no longer applied, it was just stale.

- `lib/quota.ts` — exported the previously-private `DAILY_AUDIO_SECONDS` so
  Settings shows the exact ceiling `checkAndReserve` enforces, not a second
  guess at the same number.
- `server/models/usage-model.ts` (new) — `getUsageToday`.
- `server/models/profile-model.ts` — added `updateRetentionDays`.
- `lib/mock/data.ts` — `getUsage()` now reads the real signed-in user's
  `usage_daily` row and `profiles.retention_days`, same `Usage` shape/signature
  so `app/(app)/settings/page.tsx` needed no changes to how it calls it.
- `app/api/settings/retention/route.ts` (`PATCH { days }`) — validates
  `1 <= days <= 30` (matches the DB's own `check` constraint) before writing.
- `components/app/retention-slider.tsx` — keeps `onChange` for smooth local
  dragging, persists on release (`onMouseUp`/`onTouchEnd`/`onKeyUp` for
  keyboard users) rather than one request per pixel of drag.
- **Live verification, real account (safe — reversible, non-destructive):**
  dragged the slider to 15 days, confirmed via direct Supabase query that
  `profiles.retention_days` actually became `15`; reloaded Settings and
  confirmed it displayed the persisted value with a real success toast, not a
  reset to default. "Today's free minutes" showed real numbers ("1 of 480
  minutes used") matching the actual `usage_daily.audio_seconds` recorded
  earlier this session for the real transcription work, not the old fixture's
  84/180.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests, unchanged),
  `build` all green.

## 2026-07-29 (M5.5) — real "Delete all my data"

**Done:** the last dead button in Settings. `docs/SECURITY-PRIVACY.md` §4 already
specified the exact behavior ("deletes every meeting and the `auth.users` row,
which cascades the profile... behind a typed confirmation") — the schema was
already built for it, this was wiring real code to it.

- `server/controllers/account-controller.ts` — `deleteAllUserData`: clears every
  Storage object for the user first (`audio_chunks.user_id` directly, one query
  across all their meetings, no per-meeting loop), then
  `supabase.auth.admin.deleteUser(userId)`. That single call cascades everything
  else automatically — every child table already references `profiles(id) on
  delete cascade`, and `profiles.id references auth.users(id) on delete cascade`
  (confirmed in the original migration, not assumed). Storage is the only thing
  cascade doesn't reach, so it's handled manually first.
- `app/api/account/route.ts` (`DELETE`) — reads the real session first, always
  deletes the authenticated caller's own id, never a client-supplied one.
- `components/app/delete-account-button.tsx` — typed confirmation (must type
  `DELETE` exactly to enable the real button), matching the documented "behind a
  typed confirmation." No modal primitive exists in this app, so this is the same
  inline-expanding-panel pattern as `ShareButton`/`EmailComposer`.
- **Correction to `docs/GAP-ANALYSIS.md` 1.11 found while researching:** it also
  listed a "Disconnect Google" dead button. That button doesn't exist in the
  codebase — there's nothing to disconnect, since no OAuth token is ever held
  (the M4 pivot away from the Gmail/Calendar APIs). Fixed the doc line instead
  of building a button for a feature that shouldn't exist.
- **Live verification, deliberately not against the real account:** deleting
  the actual signed-in account used for every live test this session would be
  destructive and irreversible for no real benefit. Instead, created a fully
  disposable user via `supabase.auth.admin.createUser` (no real Google OAuth
  needed for an admin-created user), gave it a real meeting with a real uploaded
  Storage object, ran `deleteAllUserData` directly, and confirmed via direct
  queries afterward: the `auth.users` row, the cascaded `profiles` row, the
  cascaded `meetings` row, and the Storage object are all genuinely gone.
  Nothing to clean up afterward — the whole disposable account no longer
  exists. Separately confirmed the real "Introduction Video" meeting and the
  real account are untouched.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests, unchanged),
  `build` all green.

## 2026-07-29 (M2.11 / M5) — real sweep cron: stalled-meeting recovery + audio purge

**Done:** `POST /api/cron/sweep` and `sweep.yml` (`docs/ARCHITECTURE.md` §5/§6),
the last named-but-unbuilt piece of the pipeline infrastructure. Researching what
"advances stalled meetings" actually requires surfaced two more real gaps
underneath it, both fixed as prerequisites, not scope creep:

- **`meetings.updated_at` never changed after insert.** `meetings_active_idx
  (status, updated_at)` already existed for exactly this staleness query, but no
  trigger populated the column on `UPDATE`. Added `set_updated_at()` +
  `before update on meetings` trigger. Verified with a real no-op update:
  `updated_at` actually moved.
- **`quota_blocked` meetings never resumed, ever.** `ARCHITECTURE.md`'s own state
  diagram documents `quota_blocked --> transcribing: quota window resets`, but
  `advance()` had no branch for it and `pipeline-poller.tsx` stopped polling
  entirely on that status (the doc says it should keep polling at 60s). A
  quota-blocked meeting was permanently stuck, tab open or not. Fixed:
  `advance()` now flips a quota-blocked meeting (once `resume_at` has passed)
  to `"transcribing"` or `"analyzing"` depending on real remaining work, and the
  poller polls at 60s while blocked. Verified live: forced a real meeting into
  `quota_blocked` with a past `resume_at`, called `advance()` twice --
  `quota_blocked → analyzing → ready`, exactly as designed.
- **A cron-invoked `advance()` would have crashed on any real Groq call.**
  `recordUsage`'s `increment_usage_daily` RPC derived the user from `auth.uid()`
  only, which is null for a `CRON_SECRET`-authenticated request with no user
  session -- the same `not null` violation hit repeatedly this session testing
  with the admin client directly. Extended the RPC to `p_user_id uuid default
  null` with `coalesce(auth.uid(), p_user_id)`; `recordUsage` gained an optional
  `userId` param, threaded through its four real call sites
  (pipeline/analysis/email/ask controllers). Browser-driven calls are unaffected
  -- `auth.uid()` still wins when a real session exists.
- `server/controllers/sweep-controller.ts` — `advanceStalledMeetings` (10-minute
  staleness or a passed `resume_at`, loops `advance()` up to 10x per meeting so
  one sweep run can make real progress, not just one flip), `purgeExpiredAudio`
  (per-user `profiles.retention_days`, skips `pinned`, real `storage.remove()`
  then `audio_purged_at`).
- `app/api/cron/sweep/route.ts` — Bearer-guarded by `CRON_SECRET`, generated a
  real value (`crypto.randomBytes(32).toString("base64url")`) and handed it to
  the user for Vercel + GitHub Actions secrets, same manual-step pattern as
  every other secret this project (Groq key, Supabase keys).
- **Live verification, careful about it:** the purge test needed a meeting past
  its retention window with a real Storage object to delete -- rather than purge
  "Introduction Video" (the one real meeting used across every feature's live
  test this session), built two disposable throwaway meetings with real
  uploaded objects, backdated `created_at` past the test user's real
  `retention_days` (7). Ran the actual `/api/cron/sweep` endpoint: the
  non-pinned one got `audio_purged_at` set and its Storage object genuinely
  deleted (confirmed via `storage.list()` returning empty); the pinned one was
  correctly skipped, object still present. Cleaned up both afterward. Also
  verified the auth guard directly: wrong secret and no header both 401, correct
  secret 200 with a real summary.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests, unchanged),
  `build` all green.

## 2026-07-29 (M5.4) — real share link, first dead button wired

**Done:** "Share a read-only link" (`docs/GAP-ANALYSIS.md` 1.11's first listed dead
button) is real. `app/share/[token]/page.tsx` was a hardcoded stub calling
`getMeeting("q3-planning")` and ignoring its own `token` param entirely — it now
looks up the real token and renders that meeting's real notes/to-dos (and
transcript, if the creator opted in). The `share_links` table, its RLS policy, and
the public-page security model were already fully designed
(`docs/DATA-MODEL.md`, `docs/ARCHITECTURE.md` §5) — this was wiring real code to
an already-decided design, same pattern as the M3 slices.

- `server/models/share-link-model.ts` (new) — owner-scoped reads/writes via the
  normal session client (RLS-protected), plus `getShareLinkByToken` which is
  **only** ever called with the admin client, matching the documented model: the
  public page has no caller session to scope RLS by, so it deliberately bypasses
  RLS and does its own explicit `revoked_at`/`expires_at` check instead.
- `server/controllers/share-controller.ts` — `createShareLink` generates the token
  with Node's built-in `crypto.randomBytes(32).toString("base64url")`, no new
  dependency, per the doc's exact spec ("32-byte base64url, generated app-side").
- `app/api/meetings/[id]/share/route.ts` (`POST`), `app/api/share/[token]/route.ts`
  (`DELETE`) — the two routes `ARCHITECTURE.md` §5 names explicitly.
- `components/app/share-button.tsx` (new) — inline expanding panel (no modal
  primitive exists in this app yet, and none of its sibling panels use one
  either) with an "include transcript" checkbox, then the URL with copy/revoke
  once created.
- **Real bug found via live testing:** `revokeShareLink` was implemented as a
  hard `DELETE`. It still produced correct behavior (a deleted row 404s the same
  as a revoked one, since `getShareLinkByToken`'s `!data` check catches both) but
  threw away the audit trail `docs/SECURITY-PRIVACY.md` §4 describes ("`revoked_at`
  is checked on every request") — no record of when a link was live or how many
  views it got before revocation. Fixed to an `UPDATE ... set revoked_at = now()`
  before shipping, not after a user hit it.
- **Live verification, unusual for this session:** the public `/share/:token`
  page needs no auth, so for once the assistant's own Playwright tooling could
  verify the full flow directly rather than handing it to the user. Created a
  real link via script (admin client, no `auth.uid()` dependency issue this
  time — plain inserts with an explicit `user_id`, unlike the LLM-quota RPCs in
  the M3 slices), loaded it in a real browser: real notes, real transcript lines,
  real "no to-dos" (correctly, not a fallback), `noindex, nofollow` confirmed in
  the rendered meta tag, `view_count` incremented in the DB. Revoked it, reloaded
  the same URL: real 404 ("This page doesn't exist"), confirmed the row still
  exists with a real `revoked_at` timestamp rather than being gone.
- Verification: `npm run typecheck`, `lint` (one `react/no-unescaped-entities` fix
  in `share-button.tsx`), `test` (45 tests, unchanged), `build` all green.

## 2026-07-29 (M3 slice 3) — real "Ask this meeting", M3 fully done

**Done:** the last unbuilt piece of M3 (`docs/AI-PIPELINE.md` §6) — real Q&A over a
meeting's transcript, retrieval-shaped, no vector database. `AskPanel`'s form
previously did `e.preventDefault()` and nothing else; it now really asks Groq and
persists to `ask_queries`. Verified live against "Introduction Video", including
through the actual browser UI (not just script/API verification).

- **Migration** — `usage_daily` gets its own `ask_calls`/`ask_tokens` bucket for
  `llama-3.1-8b-instant` (§7 gives Ask a separate, much higher daily ceiling than
  the 70B analysis/email bucket). `increment_usage_daily` grew to 7 params --
  dropped and recreated in one migration this time instead of two, applying the
  lesson from the M3-slice-1 overload bug directly rather than repeating it.
  `search_transcript_segments(meeting_id, query, limit)` (new SQL function,
  `security invoker`) does the `ts_rank_cd`-ranked query Supabase-js's builder
  can't express — the GIN index it needs already existed
  (`transcript_meeting_seq_idx`/`transcript_fts_idx`, migration
  `20260729004531_transcripts.sql`) but nothing had queried it until now.
- `lib/quota.ts` extended a third time (`askTokens`, `GROQ_DAILY_ASK_CALLS`/
  `GROQ_DAILY_ASK_TOKENS`, defaults 14400/500000 -- the confirmed §7 numbers).
- `server/config/groq.ts` — `runStructuredCompletion` gained an optional `model`
  param (defaulting to the existing 70B constant) so Ask can call the cheaper
  `llama-3.1-8b-instant` instead; `server/utils/structured-output.ts` forwards it.
- `server/utils/format-timestamp.ts` (new) — the `HH:MM:SS` formatter, previously
  private inside `analysis-controller.ts`, extracted so `ask-controller.ts` isn't
  a third copy of the same eight lines.
- `server/controllers/ask-controller.ts` — `answerQuestion`: 20-questions-per-
  meeting-per-day product cap (`countAskQueriesToday`, independent of the Groq-cost
  quota); retrieval sends the full transcript under 12k tokens, otherwise the new
  RPC's top-25 ranked matches expanded ±1 segment; the exact §6 prompt (plus the
  same explicit-schema-block fix from slices 1 and 2); the documented citation
  semantic-repair (empty citations on a non-"not found" answer gets one retry).
- **Real finding from live testing:** the model sometimes attached a citation to
  the "That does not appear in this meeting's transcript." answer itself --
  self-contradictory in the UI (a clickable "Heard at 00:00" next to "this wasn't
  said"). Not a case the doc's repair rule catches (that only covers the opposite:
  a real answer with zero citations). Fixed with a small clamp in
  `ask-controller.ts`: citations are forced empty whenever the answer is exactly
  the not-found string, regardless of what the model returned -- same spirit as
  `analysis-controller.ts`'s existing post-validation clamps.
- `app/api/meetings/[id]/ask/route.ts` (new, `POST { question }`) and
  `components/app/ask-panel.tsx` (real submit, loading state, error toasts) --
  same shape as the email regenerate route/composer from slice 2.
- **Live verification:** asked a real question with a real answer in the
  transcript ("What's Brixton's job title?") through the actual signed-in browser
  session -- got the correct answer with a correct citation (`00:21`), confirmed
  via direct Supabase query that a real `ask_queries` row exists and
  `usage_daily.ask_calls`/`ask_tokens` incremented (1 / 549) separately from
  `llm_calls`/`llm_tokens`. A deliberately unanswerable question ("Did they agree
  on a budget?") correctly returned the exact documented not-found string, not a
  guess.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests, unchanged), `build`
  all green.

**M3 is now fully done** -- transcription, analysis, email draft, and ask are all
real and verified live end to end for the first time in this project.

## 2026-07-29 (M3 slice 2) — real follow-up email draft, meetings reach "ready"

**Done:** the second automatic step docs/ARCHITECTURE.md's state machine specifies
(`analyzing --> ready: minutes + actions + email persisted`) — a meeting with real
minutes/actions now goes on to get a real drafted follow-up email, and actually
reaches `"ready"` for the first time. Verified live against "Introduction Video".

- `server/config/email-schema.ts`, `server/models/profile-model.ts` (new --
  nothing read the `profiles` table before this), `server/models/email-draft-model.ts`
  (`upsertEmailDraft` added) — supporting pieces per `AI-PIPELINE.md` §4.
- `server/controllers/email-controller.ts` — `draftEmail(supabase, meeting, tone)`:
  reads the real `summaries`/`action_items`/`profiles` rows, builds the exact §4
  prompt (including an explicit key-by-key SCHEMA block appended to the system
  prompt — same fix as slice 1's real finding, applied proactively here since
  Groq's `json_object` mode still isn't schema-aware), quota-checks and persists
  the same way `analysis-controller.ts` does. Shared by both the automatic pipeline
  step and the on-demand regenerate endpoint below.
- `server/controllers/pipeline-controller.ts` — `advanceAnalysis` now covers two
  ordered sub-steps under `"analyzing"`: no `summaries` row → run the analysis
  (unchanged from slice 1); `summaries` exists but no `email_drafts` row → draft
  the email with the user's `profiles.default_tone`, then flip `meetings.status` to
  `"ready"`. Both existing is the idempotent safety net.
- **Removed the `analysisReady` workaround from slice 1.** It existed only because
  nothing could ever flip a meeting out of `"analyzing"` yet — now that `"ready"` is
  a real terminal state this slice produces, `PipelineStatus` dropped the field and
  `components/app/pipeline-poller.tsx` went back to watching `status` directly
  (poll while `"transcribing"` or `"analyzing"`, stop and refresh otherwise). Net
  simplification, not new functionality.
- `app/api/meetings/[id]/email/regenerate/route.ts` (new, `POST { tone }`) — the
  endpoint `ARCHITECTURE.md` §5 names explicitly, callable any time after analysis
  regardless of whether the meeting has reached `"ready"` yet. `components/app/
  email-composer.tsx` gained a real "Regenerate in this tone" action wired to it
  (the tone selector previously only changed local state — picking a tone did
  nothing server-side until now).
- **Deliberately deferred, flagged not hidden:** persisting manual edits to the
  composer's subject/body fields and the `edited_by_user` discard-warning §4
  describes for regeneration. No component in the app (`TodoTable` included)
  persists inline edits server-side yet — this is a pre-existing, consistent gap,
  not something invented or skipped just for email.
- **Live verification:** ran `advance()` again against "Introduction Video" (already
  real minutes/actions from slice 1) — a real `email_drafts` row appeared with a
  real generated subject/body referencing actual meeting content, and
  `meetings.status` reached `"ready"` for the first time, confirmed via direct
  Supabase query and in the browser (status stepper shows all four steps checked).
  `usage_daily.llm_calls`/`llm_tokens` increased again (2 calls / 1733 tokens total
  for the day) — real Groq usage. Re-ran `advance()` on the now-`"ready"` meeting:
  `llm_calls`/`llm_tokens` unchanged, confirming idempotency. Separately verified
  tone regeneration (professional → friendly) produces a real, schema-valid,
  differently-toned draft and persists correctly.
  **Caveat:** the regenerate endpoint's full path (real HTTP `POST` through a
  signed-in browser session, not a script) was verified for the underlying prompt/
  persistence logic directly rather than end-to-end through the running UI, since
  the assistant's browser tooling has no authenticated session for this app and
  asking for OAuth credentials isn't appropriate — the user was handed the button
  to click directly as the actual UI-path check.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests, unchanged --
  no new pure-function logic needed unit tests this slice), `build` all green.

## 2026-07-29 (M3 slice 1) — real analysis: minutes + action items (single-pass)

**Done:** a meeting stuck at `"analyzing"` since the transcription pass now actually
gets analyzed — real minutes and action items, single-pass only (map-reduce and the
Gemini fallback both remain deliberately deferred, per the scoped plan). Verified live
end-to-end against "Introduction Video", a real 84-second self-intro recording.

- `server/config/analysis-schema.ts`, `server/utils/structured-output.ts`,
  `server/utils/text-similarity.ts` (+8 unit tests) — the Zod schema, the
  validate-then-one-repair-attempt loop, and the Levenshtein near-duplicate helper
  from `AI-PIPELINE.md` §3/§5, verbatim.
- `server/config/groq.ts` — added `runStructuredCompletion`, a generic JSON-mode
  chat completion, reusing the existing retry ladder alongside `transcribeChunk`.
- **Real bug found via live testing, not assumed:** the documented system prompt
  (§3) states the RULES but never actually spells out the JSON key names, and
  Groq's `response_format: { type: "json_object" }` is *not* schema-aware the way
  `json_schema` mode is — it just forces valid JSON, not a particular shape. First
  live call came back with the model's own guessed shape (`meetingTitle`,
  `duration` echoed back, no `overview` field, attendees missing `speakerLabel`/
  `confidence`), failing validation twice and landing the meeting in `failed`
  exactly as designed — but for the wrong reason. Fixed by appending an explicit
  key-by-key SCHEMA block to the system prompt in
  `server/controllers/analysis-controller.ts`; re-verified live afterward with a
  fully valid response on the first attempt.
- `server/controllers/analysis-controller.ts` — `analyzeMeeting(supabase, meeting)`:
  serializes the transcript, estimates tokens and throws `AnalysisTooLongError`
  over the ~5,000-token single-pass safe limit (map-reduce territory, deferred),
  quota-checks via the extended `lib/quota.ts`, runs the structured call, applies
  the documented post-validation clamps (`atSec` clamped to `duration_sec`, past
  `dueDate` nulled, sub-8-char titles dropped, near-duplicate titles merged keeping
  the earliest `atSec`), and persists via `upsertSummary` + `insertActionItems` +
  `applySpeakerRanges`.
- `lib/quota.ts` — `checkAndReserve`/`recordUsage` extended to also track
  `llmCalls`/`llmTokens` against `GROQ_DAILY_LLM_CALLS`/`GROQ_DAILY_LLM_TOKENS`.
  Required a Postgres migration to `increment_usage_daily` — **second real finding**:
  `CREATE OR REPLACE FUNCTION` with a changed parameter list creates a new overload
  rather than replacing the function (Postgres identifies functions by name +
  parameter types), confirmed by querying `pg_proc` and finding two rows for the
  same `proname` after the first migration. Fixed with a follow-up migration
  dropping the stale 3-param overload; re-verified only one 5-param version remains.
- `server/controllers/pipeline-controller.ts` — `advance()` gained an `"analyzing"`
  branch (`advanceAnalysis`), idempotent: a meeting with an existing `summaries` row
  is treated as already done and skips straight to `currentStatus` without a second
  Groq call. Verified directly: re-running `advance()` against an already-analyzed
  meeting returned instantly with `analysisReady: true` and made no Groq request.
  Since `meetings.status` intentionally stays `"analyzing"` even once minutes/action
  items are real (`"ready"` also needs the email draft, M3 slice 2 — not built yet),
  `PipelineStatus` gained an `analysisReady` boolean as the poller's actual
  done-signal; `components/app/pipeline-poller.tsx` now polls through `"analyzing"`
  too and stops once `analysisReady` flips true, refreshing the page's server data
  at that point rather than on every still-working tick.
- **Live verification (real Supabase queries, not just the UI):** `summaries` row
  has a real `user_id` (the actual browser session's auth uid, not a service-role
  key), a real generated `overview` referencing actual transcript content ("Brixton
  Romero... Naga College Foundation..."), 3 real `topics`. `usage_daily` for that day
  shows `llm_calls: 1`, `llm_tokens: 1239` — real Groq usage, not placeholders. Zero
  `action_items` rows, correctly — a 1-minute self-intro has no commitments to
  extract, and the model correctly returned an empty array rather than inventing one.
- Verification: `npm run typecheck`, `lint`, `test` (45 tests total, 8 new for
  `text-similarity.ts`), `build` all green.

## 2026-07-29 (M2 slice 1) — real transcription: quota, Groq client, /api/pipeline/advance

**Done:** the next real feature after the upload pipeline — a stuck `"transcribing"`
meeting can now actually get transcribed. Scoped tightly to transcription only, per
`docs/AI-PIPELINE.md` §2 and `docs/ARCHITECTURE.md` §3.3/§7/§8, which already fully
specified the request shape, offset/seam math, retry ladder, and quota model — nothing
here was a new design decision.

- `lib/quota.ts` — kept at that exact path (not `server/config/`) as a deliberate,
  documented exception: `CLAUDE.md` — the user's own project instructions, outranking
  the `server/` convention locked mid-project — already names this path directly.
  `checkAndReserve`/`recordUsage` against the real `GROQ_DAILY_*` ceilings confirmed
  earlier this project.
- **Real technical finding while building it:** Supabase-js's `.upsert()` can't
  express "add to the existing value" atomically — it overwrites on conflict, it
  doesn't increment. `AI-PIPELINE.md` §7's documented upsert SQL needed to become an
  actual Postgres function, not something pure Supabase-js calls could do. Added a
  10th migration, `increment_usage_daily` — `security invoker` (not definer): the row
  it writes is exactly what the existing `usage_daily` RLS policy already lets the
  caller write directly, so there's no privilege to elevate, and it derives the user
  from `auth.uid()` internally rather than trusting a passed-in id, so nobody can
  inflate or reset someone else's quota through it. Verified via direct query:
  function exists, `prosecdef: false` confirms `security invoker` took effect.
- `server/config/groq.ts` — raw `fetch`, no SDK dependency added (Groq's REST API
  doesn't need one for a single endpoint, and `CLAUDE.md` says no external libraries
  unless necessary). Full retry ladder from `ARCHITECTURE.md` §7: 429 reads
  `retry-after`, retries once in-request if under 20s else throws a typed
  `GroqRateLimitError` the controller turns into `quota_blocked`; 5xx/network failure
  gets 3 attempts with the documented exponential backoff (2s/6s/18s) before
  surfacing.
- `server/utils/transcript-stitch.ts` — the offset-shift + seam-dedup arithmetic,
  pure function, no Supabase import. **Unit tested with 7 synthetic fixtures**
  (`transcript-stitch.test.ts`) covering first-chunk (no dedup), fully-covered
  duplicate segments, fully-new segments, and both directions of a boundary-straddling
  segment (kept when >50% past the seam, dropped at exactly 50%) — `AI-PIPELINE.md`
  §2 explicitly calls this out as needing a unit test, not a model call, to verify.
- `server/models/audio-chunk-model.ts` — `claimNextPendingChunk` uses a
  select-then-conditional-update pattern (not a real Postgres advisory lock, which
  Supabase-js can't express directly without another RPC) as the concurrency guard:
  if a concurrent `advance` call already claimed the chunk, the conditional update
  affects zero rows and this returns `null`, which the controller treats exactly like
  `ARCHITECTURE.md` §7's documented "advisory lock contention → return current state,
  not an error." `releaseChunk` puts a claimed-then-quota-blocked chunk back to
  `pending` so a later call retries it instead of leaving it stuck in `processing`
  forever.
- `server/controllers/pipeline-controller.ts` — `advance()` does exactly one unit of
  work and returns, per the documented unit-of-work table: claim a pending chunk,
  quota-check, download from Storage (the caller's own client — the existing "own
  audio read" policy already allows it, no service-role needed), transcribe, stitch,
  insert, mark done, record usage. When no chunks remain, flips the meeting to
  `"analyzing"` — a real state the UI already renders, and where this honestly stops
  until the analysis pass (M3) exists to advance it further.
- `app/api/pipeline/advance/route.ts` (`POST`), `app/api/meetings/[id]/status/route.ts`
  (`GET`, the documented poll target, same response shape) — both thin delegators,
  both auth-checked like every other route this session.
- `components/app/pipeline-poller.tsx` — client component replacing the static
  `StatusStepper` on the meeting page. Polls `advance` every ~2s while
  `status === "transcribing"` (the documented browser-drives-the-pipeline model —
  closing the tab pauses work, it never fails it, since all state lives in Postgres),
  stops the moment status changes to anything else.

**Verified:** `npm run typecheck`, `lint`, `test` (37 now, up from 30 — the 7 new
stitching tests), `build` all green. New routes confirmed in the build output.
`GROQ_API_KEY` confirmed empty in `.env.local` (checked without exposing it, same
length-probe method as every other key check this session) — real end-to-end
transcription against the "Introduction Video" meeting from last session needs it,
same external-key shape as every other provider this project uses.

**Real bug found on first live test, fixed immediately:** `chunk_status` has 5 values
(`pending → uploaded → processing → done/failed`) — `pending` means "not yet
uploaded," set at meeting creation; `finalizeUpload` clears it to `uploaded` once
every signed-URL `PUT` succeeds. `claimNextPendingChunk` queried for `status =
'pending'`, but by the time transcription can run every real chunk is already
`uploaded`. It found nothing, concluded "no work left," and silently advanced the
meeting straight to `"analyzing"` without transcribing anything. Caught by checking
the real DB after the first live attempt (`transcript_segments` empty, chunk
untouched, `usage_daily` empty) rather than trusting the UI's "Picked apart" state at
face value. Fixed: renamed and corrected to `claimNextChunkToTranscribe`/
`hasChunksAwaitingTranscription`, querying `'uploaded'` (and `releaseChunk` now
returns a chunk to `'uploaded'`, not `'pending'`). Reset the test meeting's chunk back
to `uploaded` and meeting back to `transcribing` to retry with the fix.

**Second real gap on retry:** `GROQ_API_KEY` was only in `.env.local` — same class of
mistake as the earlier Supabase production incident, `.env.local` never reaches
Vercel automatically. The user was testing against the live site, not localhost.
Added the key in Vercel (Production + Preview), redeployed, confirmed via
`/api/health`'s commit SHA that the new deploy was actually live before retrying.

**Fully verified live after both fixes — real data, not assumed:**
- `transcript_segments`: 8 real rows, genuine Whisper transcription of the uploaded
  audio, sequential timestamps `0.00s → 83.86s` matching the meeting's `duration_sec`.
- `audio_chunks`: `status: "done"`, `attempts: 0` — succeeded on the first real call,
  no retry ladder needed.
- `usage_daily`: real row, `asr_calls: 1`, `audio_seconds: 84` — exactly the chunk's
  duration, proving the atomic `increment_usage_daily` function works correctly.
- `meetings.status`: `"analyzing"` — the pipeline correctly stopped at the real
  boundary of what's built so far.

**Retry ladder under a real 429/5xx still unverified** — didn't occur organically on
a single successful call, and deliberately abusing the free tier just to trigger one
isn't worth doing to prove a well-specified, code-reviewed loop. Flagged honestly,
not assumed.

**Next:** minutes/actions/email (M3) is the remaining AI-layer chunk — needs Zod
schemas and structured LLM output, not built yet.

---

## 2026-07-29 (production incident) — live site down: Vercel env vars never synced

**What happened:** the previous commit (real upload pipeline + `middleware.ts`)
deployed cleanly but took the live site down — `500 MIDDLEWARE_INVOCATION_FAILED` on
every request, since `middleware.ts`'s matcher covers almost the whole site.

**Root cause:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only
ever existed in `.env.local` (gitignored, local-only). `docs/DEPLOYMENT.md` §2 always
said "set the same keys in Vercel for Preview and Production," but nothing in this
session ever actually confirmed that had been done — earlier verification only
checked that the Vercel *project* was connected and deploying (`GAP-ANALYSIS.md`
P2.6), which is a different fact from "the env vars it needs at runtime are set."
Every prior commit before `middleware.ts` existed happened to work anyway (nothing
read those env vars at request time on every route), so the gap stayed invisible
until middleware made it universal.

**Fixed:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` added in Vercel → Settings →
Environment Variables (Production + Preview), redeployed. Verified live, not just
"looks fixed": `/` → `200`, `/dashboard` → `307` to `/login` (middleware running
again, correctly), `/api/health` → `200` with the deployed commit SHA.

**Lesson, applied going forward:** "Vercel is connected" and "Vercel has the env vars
the app actually needs" are two separate facts — the first was verified early this
session (P2.6), the second never was until it broke production. Every future env var
added to `.env.example` should get a matching check (or at least a reminder) against
the actual Vercel dashboard, not just local `.env.local`.

---

## 2026-07-29 (later still) — Real upload pipeline: ffmpeg chunker, POST /api/meetings, full getter swap

**Done:** the actual prerequisite for everything downstream. Before this, no real
meeting could exist — `dropzone.tsx` was a fake `setInterval` that never read a file.
Swapping `lib/mock/data.ts` to real queries before this existed would have just shown
empty states everywhere.

- `lib/audio/chunker.ts` — `@ffmpeg/ffmpeg` + `@ffmpeg/util` installed
  (single-threaded core only, per the threading decision locked in `ARCHITECTURE.md`
  §3.4 before any chunker code existed). Duration probed via a native `<audio>`
  element rather than parsing ffmpeg's stderr log — simpler, and doesn't need the
  ~31 MB WASM module loaded just to answer "how long is this file". Transcodes once
  to 16 kHz mono Opus, then cheaply stream-copies ~10-minute chunks with a 3-second
  trailing overlap off that single transcode rather than re-encoding per chunk.
  Explicit fallback to direct upload under 20 MB if the WASM module fails to load —
  no silent failure, matches the documented behavior exactly.
- **Real decision, not in the original plan text:** initially planned to self-host the
  ffmpeg core files in `public/`. Checked the actual file size first —
  `ffmpeg-core.wasm` is ~31 MB, far too large to commit into the repo (git bloat,
  slower clones). Switched to the CDN-fetch pattern (`unpkg`) that ffmpeg.wasm's own
  docs recommend for exactly this reason, and removed the now-unused local
  `@ffmpeg/core` package.
- `server/models/{meeting,transcript,summary,action-item,email-draft,ask-query}-model.ts`
  — one file per table, per the locked `server/` convention. `action-item-model.ts`
  joins the meeting title via Supabase's embedded-resource select (`*, meetings(title)`)
  since the UI's `Todo` type needs it displayed inline.
- `server/controllers/meeting-controller.ts` — `createMeeting` (validates, inserts the
  meeting directly as `"uploading"` rather than the documented `"draft"` — the UI's
  `MeetingStatus` type never rendered a draft state to begin with, and the two are
  functionally simultaneous in this flow, so skipping the round-trip is a deliberate,
  documented simplification, not a miss), `finalizeUpload` (marks every chunk
  uploaded and flips the meeting to `"transcribing"` in one call — correct because
  it's only ever called after every signed-URL `PUT` already succeeded, so
  "uploaded" is genuinely true for all chunks at once, not a partial/incremental
  status this pass tracks).
- **Real correction mid-build:** the plan assumed a raw `fetch PUT` to the signed
  upload URL. Supabase's signed-upload flow actually requires the SDK's
  `uploadToSignedUrl(path, token, file)` method with a separate `token` value, not
  just the URL string. Caught before writing the dropzone code, not after — the
  controller's response shape was adjusted from `{ uploadUrl }` to `{ path, token }`
  before `app/api/meetings/route.ts` was even written.
- `app/api/meetings/route.ts` (`POST`), `app/api/meetings/[id]/route.ts` (`PATCH`) —
  thin delegators. Both check `auth.getUser()` themselves and return a real
  `{ error: { code, message } }` 401 — `middleware.ts` only protects page routes, not
  `app/api/**`, a gap worth remembering for every future route handler.
- `components/app/dropzone.tsx` rewritten — chunks the real file, calls the real API,
  uploads chunks 2-at-a-time via a small worker-pool loop, finalizes, redirects to
  the real `meetingId`.
- `lib/mock/data.ts` — every getter now a real query except `getUsage` (needs
  `lib/quota.ts`'s limit logic, not built yet, P1.5). Mapped several real schema/UI
  mismatches discovered while writing this, not assumed away: DB's `action_status`
  enum uses `in_progress`, the UI's `TodoStatus` uses `doing` (mapped on read);
  `summaries.topics` JSONB is richer (`{title, points[], atSec}`) than the UI's flat
  `NoteItem` (`{text, at}`) — flattened to the title for now, full reconciliation is
  M3 work alongside the real summarization UI; no schema column tracks "this to-do's
  owner is still an unconfirmed AI guess", approximated as `ai_generated &&
  !edited_by_user` until a dedicated column exists. The old fixture arrays are
  deleted — `ARCHITECTURE.md` §4 already documented this as `lib/mock/`'s expected
  retirement point.

**Consequence surfaced, not hidden:** `/share/[token]` still hardcodes `q3-planning`
(P1.10, deliberately out of scope for this pass) — that id no longer exists in the
real DB, so the share page now renders blank instead of leaking the old fixture data.
Safer failure mode than before, but still needs its real implementation.

**Verified — what's provable without a real Google session, and what isn't:**
`npm run typecheck`, `lint`, `test`, `build` all green, no regressions. Curl-confirmed
the real auth boundary: `POST /api/meetings` and `PATCH /api/meetings/:id` both `401`
with no session, matching `ARCHITECTURE.md` §5's documented error shape exactly;
`/upload` still `307`s to `/login`. Checked the live `profiles` table directly — empty,
confirming no sign-in has happened yet, so the actual authenticated upload path
(chunk → create → upload → finalize → real DB rows) could not be exercised by this
session and needs the user to actually sign in and try a real upload. Left the dev
server running for that.

**Next:** once a real upload is tested, confirm via `supabase db query` that the
`meetings`/`audio_chunks` rows and the Storage object actually exist and belong to the
signed-in user (RLS still holding, not a service-role bypass) — same trusted
verification pattern as P1.1/P1.2. After that: `lib/quota.ts`, the AI layer, and
eventually `/api/pipeline/advance` (M2) are what turn an uploaded-but-stuck meeting
into a transcribed one.

---

## 2026-07-29 (later) — P1.3 external setup completed, sign-in fully live

**Done:** the two external steps flagged in the earlier entry today are complete.

- Google Cloud: new project `syncmind`, OAuth consent screen (External, published to
  Production via the combined "Get started" wizard — Google's newer UI merges what
  used to be separate consent-screen and audience steps), OAuth client ID (Web
  application) with authorized origin `http://localhost:3000` and redirect URI
  `https://keqagpktcrwuovkuqwno.supabase.co/auth/v1/callback` (Supabase's fixed
  callback, not our own `/auth/callback` — the two are different URLs by design,
  Supabase is the OAuth client from Google's perspective).
- Supabase dashboard → Authentication → Sign In / Providers → Google → enabled,
  client ID and secret pasted in, saved.

**Re-verified with Playwright, this time reaching further than the earlier check
could:** clicked "Continue with Google" on `/login` again. Instead of the `400`
`"provider is not enabled"` from before, the browser now lands on a real
`accounts.google.com/v3/signin/identifier` page — confirmed `client_id` matches the
one just created, `redirect_uri=https://keqagpktcrwuovkuqwno.supabase.co/auth/v1/callback`
matches exactly, `scope=email+profile` only (no Gmail/Calendar scopes ever
requested, matching the P0.1 decision). Screenshot confirmed the real Google account
picker rendering "Sign in to continue to keqagpktcrwuovkuqwno.supabase.co". Did not
complete the sign-in itself with real credentials — that's the user's own account
action, not something to automate.

**P1.3 is now fully resolved, not just code-complete.** No remaining blocker.

---

## 2026-07-29 — P1.3: auth wired end-to-end, verified up to the external boundary

**Done:** `middleware.ts` (repo root — Next.js requires this exact location, same
class of constraint as `route.ts`; uses `@supabase/ssr`'s request/response-based
client since middleware runs before `next/headers`' `cookies()` is available),
`app/login/page.tsx` + `components/app/login-button.tsx` (split so the page can stay
a Server Component exporting real `<title>` metadata — a client component can't
export `metadata`, first version had a generic fallback title, caught and fixed),
`app/auth/callback/route.ts` (exchanges the OAuth code for a session, redirects to
`next` or `/dashboard`), sign-out wired into `components/app/sidebar.tsx` (didn't
exist at all before), `app/(app)/settings/page.tsx`'s "You" section now reads the
real session instead of the hardcoded "Maya Osei" fixture (P1.12, closed as a side
effect of building real auth, not separate work). Marketing CTAs
(`components/marketing/{nav,hero}.tsx`) repointed from `/dashboard` to `/login` — the
hero button's copy already said "Continue with Google", it just didn't do anything
yet.

**Key finding that shaped scope, confirmed before writing code:**
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are configured *inside Supabase's own
dashboard*, not read by our application code at all — Supabase is the OAuth client
from Google's perspective, our code only calls `signInWithOAuth` and receives a
`code` back. This meant the entire code portion of P1.3 needed zero additional env
vars and could be built and verified today, with only the *external* configuration
left as a genuine blocker.

**Verified for real, not assumed — three separate checks:**
1. `curl -i` against protected routes with no session: `/dashboard` and `/settings`
   both `307` to `/login?next=<original path>`. Public routes (`/`, `/login`,
   `/share/whatever`) stay `200`. Proves the middleware matcher and protection logic
   are both correct.
2. Playwright: `/login` renders correctly, zero console errors, correct page title
   after the metadata fix.
3. Playwright: actually clicked "Continue with Google". Browser navigated to a real
   Supabase PKCE authorize URL
   (`.../auth/v1/authorize?provider=google&redirect_to=...&code_challenge=...`) —
   confirms `redirectTo` points at the right `/auth/callback` with `next` correctly
   encoded. Got back `400 {"error_code":"validation_failed","msg":"Unsupported
   provider: provider is not enabled"}` — the *exact* expected response, since the
   Google provider isn't enabled in Supabase yet. This is proof the code is correct,
   not a failure: everything up to Google's own OAuth screen works.

**What actually unblocks a real, working sign-in — concrete, not abstract**
(`docs/DEPLOYMENT.md` §5 already has the detailed version):
1. Google Cloud Console (console.cloud.google.com) — new project, OAuth consent
   screen (External, publish straight to Production — the `email`/`profile` scopes
   are unrestricted, no Google review needed), Credentials → OAuth client ID → Web
   application.
2. Authorized redirect URI: the callback URL Supabase's dashboard shows you (step 3)
   — not our own `/auth/callback`, Supabase's own domain.
3. Supabase dashboard → Authentication → Providers → Google → enable, paste the
   client ID and secret from step 1.
4. Test by actually clicking "Continue with Google" on `/login` — should reach a real
   Google consent screen instead of the `400` seen today.

None of this needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env.local` — they
only ever get pasted into Supabase's dashboard.

**Verified:** `npm run typecheck`, `lint`, `test` (still 30 — no new pure-function
logic worth unit testing here, this is I/O-shaped code exercised by the Playwright/
curl checks above instead), `build` all green. Cleaned up accumulated zombie `node`
processes from repeated background dev-server restarts this session
(`Stop-Process` sweep) before the final verification run.

**Next:** the client factories and auth are both real now. The next chunk is
`app/api/**` route handlers plus swapping `lib/mock/data.ts` reads for real Supabase
queries — the actual "the app does something" milestone.

---

## 2026-07-29 — P1.2: Supabase client factories, and a real permission bug found + fixed

**Done:** `lib/supabase/browser.ts` (publishable key, `createBrowserClient` from
`@supabase/ssr` — safe in `"use client"` components, RLS is what actually restricts
it, not key secrecy), `server/config/supabase-server.ts` (cookie-based
`createServerClient`, Server Components read through this directly per
`ARCHITECTURE.md` §4 — `getAll`/`setAll` cookie handlers, `setAll` no-ops safely when
called from a context that can't set cookies since middleware — not built yet —
handles the actual session refresh), `server/config/supabase-admin.ts` (service-role,
bypasses RLS, only for the three places `DATA-MODEL.md` §4 names: share page,
`/api/cron/*`, pipeline storage reads). Installed `@supabase/supabase-js` +
`@supabase/ssr`.

**Real bug found during verification, not assumed fixed:** built a temporary debug
route (`app/api/_debug-supabase` — first attempt 404'd, Next treats `_`-prefixed
folders as private/excluded from routing, renamed to `debug-supabase`) calling
`createAdminClient()` against the live `profiles` table. Got back `{ message: '' }` —
an error with no code, no stack, nothing else useful.

Chased down several red herrings before finding the real cause, worth recording since
they'll look identical to a first-time debugger:
1. Suspected the pasted anon/service-role keys were truncated (the dashboard UI shows
   them with a visual "..." ellipsis in a narrow box). Had the user re-copy with the
   actual copy-icon buttons. Same lengths came back — this was a red herring, the new
   `sb_publishable_`/`sb_secret_` key format is genuinely short by design, unlike the
   old ~200-char JWT keys. The ellipsis was just CSS truncation, not real truncation.
2. Suspected a stale dev-server process holding old env vars (Next only reads
   `.env.local` at boot). Restarted — same error. Also a real, separate problem
   (background dev-server processes on this machine don't always die cleanly when
   stopped, leaving zombies on old ports — 3000, 3002, 3003 all had leftover
   listeners at different points), but not the actual cause here.
3. **Actual cause**, found by bypassing the JS client entirely and curling the REST
   API directly with the service-role key: `403`, `"permission denied for table
   profiles"`, `"hint":"Grant the required privileges to the current role with:
   GRANT SELECT ON public.profiles TO service_role"`. RLS was correctly enabled
   (verified in the P1.1 pass), but Postgres checks table-level `GRANT`s *before* RLS
   ever runs, and those were never opened — because "Automatically expose new
   tables" was deliberately left off at project creation (P1.1, so nothing became
   queryable before RLS was in place), and that toggle is what normally auto-grants
   `anon`/`authenticated`/`service_role` on dashboard-created tables. Migration-created
   tables don't get that for free; needed an explicit `grant`.
4. **Fixed with a 9th migration**, `grant_privileges` — `grant all` broadly to
   `anon`/`authenticated`/`service_role` on the `public` schema, plus
   `alter default privileges` so future migration-created tables inherit it
   automatically. Not a security loosening: `anon` still has no session, RLS still
   evaluates false for it on every row. Documented the two-layer model (GRANT +
   RLS, not RLS alone) in `docs/DATA-MODEL.md` §4 so this doesn't get rediscovered
   the hard way on the next table.
5. Re-verified with the same direct-curl method first (isolates the database from
   the JS client layer) — `200`, empty array, correct. Then re-verified through the
   actual app code path (the debug route calling the real `createAdminClient()`) —
   `{"ok":true,"profilesCount":0}`. Removed the debug route.

**Also cleaned up:** killed the lingering zombie `node` processes across stale dev
server instances (PowerShell `Stop-Process`) before the final clean verification run,
so port 3000 resolved predictably again.

**Verified:** `npm run typecheck`, `lint`, `test` (still 30, nothing new — no test
coverage was owed here, these are thin client factories with no branching logic of
their own to unit test) and `build` all green, same 13 routes, no `debug-supabase`
leftover in the build output.

**Never touched:** the database password, or the raw key values — every diagnostic
step (length checks, prefix/suffix checks, the direct curl tests) was written to
avoid printing secret content into the conversation, using shell variable
indirection and substring probes instead of `cat`.

**Next:** the client factories exist but nothing uses them yet — `lib/mock/data.ts`
is still what every page reads. That swap, plus auth (`middleware.ts`, Google
sign-in, `/auth/callback`) is the next real chunk of P1.

---

## 2026-07-28 — P1.1: Supabase project created, schema applied and verified

**Done:** the actual start of the real backend build. User created the Supabase
project through the dashboard (org `QUAN7UM`, project `syncmind`, region
`ap-southeast-1`/Singapore — closest to their location). Project ref
`keqagpktcrwuovkuqwno`.

- Installed the Supabase CLI (`npm install -g supabase`, v2.110.0 — worked directly,
  no longer blocked the way older CLI versions were).
- `supabase login` needed a real interactive terminal (this session's Bash tool is
  non-TTY, browser-based OAuth login can't run through it) — user ran it in their own
  PowerShell window. Hit Windows' default script-execution-policy block on the npm
  `.ps1` shim; worked around with `supabase.cmd login` rather than changing the
  system's execution policy (a global security setting, not something to touch for a
  local CLI login).
- `supabase link --project-ref keqagpktcrwuovkuqwno` and `supabase init` — both run
  from this end once login succeeded, since linking/config scaffolding don't touch
  credentials that need to stay out of chat. `supabase/config.toml` created.
- **8 migrations**, transcribed exactly from `docs/DATA-MODEL.md` §2-§5 (enums,
  profiles+trigger, meetings+chunks, transcripts, summaries/actions/email,
  share/ask/usage, RLS policies on all 10 tables individually — not the doc's
  "repeat this shape" placeholder — storage bucket+policies). Created with
  `supabase migration new <name>` for real timestamped filenames rather than the
  doc's illustrative `0001_x.sql` numbering, since that's what `supabase db push`
  actually expects.
- Re-checked `DATA-MODEL.md` for staleness against the earlier OAuth-drop decision
  (P0.1) before writing SQL against it — already clean, no `google_connections`
  table, no `gmail_draft_id`. Good that it was checked rather than assumed.
- `supabase db push --linked --dry-run` first to validate before applying for real.
  Push itself showed unrelated Docker errors (a local migration-catalog caching step
  that needs Docker Desktop, which isn't installed) — did not treat the push as
  failed on Docker noise alone; re-ran `--dry-run` afterward and got
  `"upToDate":true"` confirming the real remote push succeeded independent of the
  Docker step.
- **Verified against the live database with real queries, not just "push didn't
  error":** all 10 tables present with `rowsecurity = true`, 13 policies (10
  owner-only + 3 storage), `recordings` bucket exists and is private,
  `on_auth_user_created` trigger exists. Used `supabase db query` for all of this —
  authenticates through the already-logged-in CLI session, never touched the DB
  password.
- Generated types: `supabase gen types typescript --linked` into
  `server/models/database.types.ts` — not `lib/supabase/types.ts` as `DATA-MODEL.md`
  §8 previously said, corrected to match the `server/` convention locked earlier this
  session. `docs/DATA-MODEL.md` §8 updated to reflect both the real filename
  convention and the corrected types path.
- `npm run typecheck`, `lint`, `test` all stay green with the new generated file
  present (nothing imports it yet, so this only confirms it's valid TypeScript).

**Never touched:** the database password, the anon key, the service-role key. All
CLI operations authenticated through the login session or the management API, none
needed the raw Postgres credential.

**Next: P1.2** — `server/config/supabase.ts` client factories (browser/server/admin).
This genuinely needs the anon key and service-role key from Settings → API — paste
those into `.env.local` yourself, never into chat.

---

## 2026-07-28 — Backend folder structure locked: server/ with MVC-style layers

**Done:** the user wants a controller/model/middleware/config/utils convention for
the P1 backend, adapted from Express-style MVC. Flagged and resolved two real
constraints before building anything on top of the wrong shape: Next.js App Router
routing is filesystem-based and non-negotiable (`app/api/**/route.ts` must exist as
the actual HTTP entry points — can't move into `server/`), and a literal separate
Express process was explicitly ruled out (breaks the zero-cost, no-always-on-worker
architecture every prior decision this session assumed). Landed on: `route.ts` files
as thin one-line delegators into `server/controllers/`, `server/routes/` as a
reference map rather than the real dispatcher, guard functions in
`server/middleware/` called explicitly (no Express chaining exists in App Router).

- `docs/ARCHITECTURE.md` §4 rewritten: full `server/` tree
  (controllers/models/middleware/config/utils/routes), a routing-note paragraph
  explaining the two constraints above, and `lib/` redefined as strictly
  shared/client-safe code (types, utils, motion, the deliberately-client-side
  `lib/export/*`, `lib/mock/data.ts` until retired). `lib/quota.ts` deliberately
  *not* moved — already named as a path in `CLAUDE.md`, revisit when it's actually
  built rather than rename out from under existing project instructions.
- **One real worked example, not a stub**: migrated `/api/health` (the only backend
  logic that existed) into the new pattern. `server/config/env.ts` (scoped to what
  the health check actually needs, not a speculative catch-all), plus
  `server/controllers/health-controller.ts` (framework-agnostic — no `next/server`
  import, proves controllers are testable without mocking Next), and
  `app/api/health/route.ts` reduced to a two-line delegator.
  `server/controllers/health-controller.test.ts` added, following the Vitest pattern
  from the P2.9 pass.
- Deliberately did **not** scaffold `server/models/` or `server/middleware/` with
  empty placeholder content — per this repo's own `CLAUDE.md` guidance against
  half-finished implementations and premature abstraction, those get real content
  when there's something real to model or guard (P1.2+, once Supabase exists).

**Verified behavior-preserving, not just a file shuffle:** curled `/api/health`
before and after — identical `{status, timestamp, commit}` shape, `commit` still
correctly falls back to `"dev"` locally. `npm run typecheck`, `lint`, `test` (30
tests now, up from 28), and `build` all green, same 13 routes, same bundle sizes.

**What actually unblocks P1.1 next — concrete, not abstract:**
1. Sign up free at supabase.com (no card required).
2. New project — pick the region closest to you, **save the database password**
   somewhere safe, it's only shown once.
3. `npm i -g supabase`, then `supabase login`.
4. `supabase link --project-ref <ref>` (ref is in the project's Settings → General).
5. Once linked, migrations from `docs/DATA-MODEL.md`'s schema can be written and
   applied with `supabase db push` — that's the actual start of P1.1's build work.

Steps 1-2 only you can do (account creation, password). Steps 3-5 onward I can do
once you've completed 1-2 and shared the project ref / connection details (never the
DB password itself — that only goes in `.env.local`, never pasted into chat).

---

## 2026-07-28 — Sentry error monitoring wired

**Done:** P2.10 from `docs/GAP-ANALYSIS.md`. Last standalone P2 item — everything past
this is P1, the real backend.

Checked Sentry's current docs live before building (SDK conventions changed between
majors): the Next.js 15 App Router convention is `instrumentation-client.ts`, not the
older `sentry.client.config.ts`. Installed `@sentry/nextjs@10.68.0` (current, compatible
with Next `^15.0.0`).

- `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` —
  all three read one var, `NEXT_PUBLIC_SENTRY_DSN`, with `enabled: Boolean(dsn)`
  explicit rather than relying on implicit no-op behavior. Error capture only, no
  performance tracing — stays clear of Sentry's separate, smaller performance quota.
- `instrumentation.ts` — registers the server/edge config by runtime, exports
  `onRequestError = Sentry.captureRequestError` (server/middleware error capture — a
  no-op today since `app/api/**` barely exists, starts earning its keep once P1 adds
  real server code).
- `next.config.ts` wrapped with `withSentryConfig`. No Sentry project exists yet, so
  `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` are all unset —
  `sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN }` set explicitly rather than
  trusting undocumented graceful-failure behavior when the token's missing.
- `app/error.tsx` and `app/global-error.tsx` (from the P2.4 pass) both now call
  `Sentry.captureException(error)` alongside the existing `console.error`.
  `global-error.tsx` needed its signature widened to receive `error`, not just `reset`.
- Build surfaced one real actionable warning: Sentry requires exporting
  `onRouterTransitionStart` for navigation breadcrumbs (context for error reports, not
  performance tracing) — added, warning gone on rebuild.
- Corrected `.env.example`/`docs/DEPLOYMENT.md`: the old `SENTRY_DSN` was marked
  server-only, which is backwards — a DSN isn't a secret (Sentry's own docs confirm
  it's meant to be embedded client-side), so it's `NEXT_PUBLIC_SENTRY_DSN` now. Added
  `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for source-map upload — those *are*
  build-time-only and sensitive.

**Verified the disabled path is actually safe, not just assumed:** temporarily added a
module-level `throw` to `app/(app)/settings/page.tsx`, confirmed via Playwright the
500 and error boundary behaved correctly with no Sentry-related console errors — proof
`Sentry.captureException` doesn't itself throw when `enabled: false`. Reverted, diff
confirmed clean. Full rebuild with zero Sentry env vars set stays green, same 13
routes, no warnings.

**Honest tradeoff, noted not hidden:** shared client JS grew from 103 kB to 185 kB —
that's the Sentry browser SDK's real cost, not a bug. Worth it for actually finding out
about live bugs; flagging in case bundle size becomes a complaint later.

**Still open:** you need to create a free Sentry project (sentry.io, no card) and set
`NEXT_PUBLIC_SENTRY_DSN` in Vercel for this to report anywhere — same shape as the
Groq-limits task. Until then it's a correctly-wired no-op.

**Every standalone P2 item is now closed or waiting on P1.** What's left is P1 itself.

---

## 2026-07-28 — Vitest installed, 28 real tests, wired into CI

**Done:** P2.9 from `docs/GAP-ANALYSIS.md` (partial — the parts of it that exist in
code). No test runner existed in this repo before now. `docs/ARCHITECTURE.md` §10
names the eventual unit-test surface — chunk offset math, JSON schema validation,
`.ics`/`.srt` generation, quota arithmetic — but only one of those exists today: the
`.ics` generator. Scoped to what's real: `lib/export/ics.ts`, `lib/export/gmail.ts`,
and the pure helpers in `lib/types.ts`.

- `vitest.config.ts` — reuses the `@/*` path alias from `tsconfig.json`, no jsdom
  (nothing under test touches the DOM).
- `lib/types.test.ts` (9 tests) — `formatTimecode`, `formatDuration`, `isOverdue`
  (including the documented `status === "done"` short-circuit), `formatDate`.
- `lib/export/ics.test.ts` (11 tests) — `buildIcs`'s RFC 5545 output: DTEND is the day
  *after* the due date (all-day events are exclusive-ended — tested including a
  month-boundary rollover), comma/semicolon/backslash escaping, and line-folding at 75
  octets (verified by reconstructing the original line from the folded output, not by
  hand-computing fold boundaries). Plus `slugify` and `datedTodos`.
- `lib/export/gmail.test.ts` (8 tests) — URL encoding for both the Gmail deep link and
  `mailto:` fallback, the `MAX_COMPOSE_URL` threshold, and `asPlainText`'s exact output
  shape (the copy button depends on this being right).
- `npm run test` → `vitest run` (single pass, CI-friendly). Wired into
  `.github/workflows/ci.yml` as a fourth step: typecheck → lint → test → build.

**Verified the tests actually test something:** flipped the comparison operator in
`isOverdue` (`<` → `>`), reran — 2 tests failed with the expected assertion mismatches,
confirming they exercise real logic rather than trivially passing. Reverted.

All 28 tests pass; `npm run typecheck`, `npm run lint`, `npm run build` all stay green.

**Still open:** chunker offset math and Playwright E2E both need code that doesn't
exist yet — P1. P2.10 (error monitoring) is the last standalone P2 item; everything
else from here is P1, the real backend.

---

## 2026-07-28 — Error/not-found UI + OG image, robots, sitemap

**Done:** P2.4 + P2.5 from `docs/GAP-ANALYSIS.md`.

- `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx` — all reuse
  `components/ui/empty-state.tsx` for visual consistency with the rest of the app,
  wrapped in a self-contained shell since they render outside the `(app)` layout's
  sidebar. `error.tsx` is a Client Component per Next's requirement, logs the caught
  error (bare error only, no transcript/user content, per `SECURITY-PRIVACY.md` §6).
- `app/global-error.tsx` — the outermost fallback, replaces `<html>`/`<body>` itself
  when the root layout crashes, so it can't use Tailwind (the thing that crashed) —
  plain inline styles, on-brand colors hardcoded.
- `app/opengraph-image.tsx` — `next/og`'s `ImageResponse`, 1200×630. Recreates the
  brand mark (`components/brand.tsx`'s `Mark`) as inline SVG paths rather than
  importing the React component, since Satori's JSX-to-image renderer isn't guaranteed
  to handle arbitrary component imports. Colors as static hex (Satori can't read CSS
  custom properties or `oklch()`) — reused the same conversion `app/icon.svg` already
  did.
- `app/robots.ts`, `app/sitemap.ts` — allow everything except `/share/*` and `/api/*`;
  sitemap lists only `/` for now, since everything else sits behind auth that doesn't
  exist yet and is private data once it does.

**Real bug found via the build, not by inspection:** `next build` warned
`metadataBase property in metadata export is not set` — without it, Next resolves the
auto-detected `opengraph-image.tsx`'s URL against `http://localhost:3000`, so the
`og:image` tag on the live site would have pointed at localhost. The feature would
have built cleanly, looked correct in every local check, and simply not worked when
anyone actually pasted the live link anywhere. Fixed by adding `metadataBase` to
`app/layout.tsx`'s metadata export, sourced from `NEXT_PUBLIC_APP_URL` with a fallback
to the known live URL. Rebuilt to confirm the warning is gone.

**Also hit and fixed:** a stale `.next` build cache from switching between `next build`
and `next dev` in the same session caused a false-positive 500 on `/does-not-exist`
(`ENOENT` on a vendor chunk) — cleared `.next`, restarted, confirmed 404 with the
custom page rendering correctly. Not a code issue.

Verified end to end with Playwright: `/does-not-exist` renders the custom not-found
page (correct 404 status), `/opengraph-image` renders the branded PNG correctly,
`/robots.txt` and `/sitemap.xml` both resolve. `npm run typecheck`, `npm run lint`,
`npm run build` all green.

**Next:** every "fix what's wrong" and "look right when shared" P2 item is done.
What's left in P2 is test coverage (2.9) and error monitoring (2.10) — otherwise it's
P1, the actual backend.

---

## 2026-07-28 — README fixed: no longer lies about its own status

**Done:** P2.7/P2.8 from `docs/GAP-ANALYSIS.md`. The README's Status section said
"Pre-build. Planning documents are complete; no application code exists yet" — true at
commit db30f31, false for most of this project's life, and badly false after today's
session (live deploy, CI, keepalive, exports, real Groq limits all shipped). It's the
first thing anyone sees on the repo.

- Status section now states the real, live state and links the live URL
  (`sync-mind-three.vercel.app`) — previously not mentioned anywhere in the README, an
  odd omission for a portfolio repo whose whole point is the live link.
- Dead `docs/DESIGN-SYSTEM.md` link (deleted in db30f31) repointed to
  `app/globals.css` in both the README's doc table and `docs/ROADMAP.md` M0.4/M1.2 —
  matches `CLAUDE.md`'s existing "the code is now the doc" framing.
- Quickstart ungated from "(once M0 lands)" — M0 substantially has. Clarified that
  `.env.local` isn't needed yet since nothing reads it (no Supabase/AI calls exist),
  rather than implying setup is required before `npm run dev` works.
- Added a `GAP-ANALYSIS.md` row to the README's doc table — it's become the
  actively-maintained punch list this session, worth surfacing alongside the other
  docs.

**Every "fix what's wrong" P2 item is now closed** (2.1, 2.2, 2.6, 2.7, 2.8). What
remains in P2 is genuinely new build work: error/not-found pages (2.4), OG image
(2.5), tests (2.9), error monitoring (2.10) — plus all of P1, the real backend.

---

## 2026-07-28 — ESLint installed, `npm run lint` fixed

**Done:** P2.1/P2.2 from `docs/GAP-ANALYSIS.md`. `npm run lint` ran `next lint` with no
ESLint installed and no config — broken since the repo was scaffolded, and flagged as
such in `CLAUDE.md`'s command list.

- Installed `eslint@9` + `eslint-config-next@15.5.22`, pinned to exactly match the
  installed Next version rather than a loose `^15` range.
- `eslint.config.mjs` — flat config, `FlatCompat` bridging `next/core-web-vitals` +
  `next/typescript` (the config shape `eslint-config-next` still ships, even under
  ESLint 9's flat-config-only world). `next lint` itself is deprecated in Next 15 and
  removed in 16, so the script now calls `eslint .` directly rather than routing
  through Next's CLI.
- Two real findings, both fixed in config rather than by touching working code: the
  `_meetingId`-prefixed unused params in `lib/mock/data.ts` (intentional — those
  getters mirror the real Supabase query signatures they'll be swapped for, per
  `CLAUDE.md`) needed an `argsIgnorePattern: "^_"` override rather than a rename.
  `next-env.d.ts` (Next's own auto-generated file, "should not be edited" per its own
  header comment) needed an explicit ignore.
- `npm run lint` passes clean. Wired into `.github/workflows/ci.yml` as a third step
  (typecheck → lint → build), all green.
- Fixed `CLAUDE.md`'s stale "BROKEN: next lint..." note in the commands list.

**Aside:** `npm audit` reports 12 high-severity findings after this install. Checked
each — none are actionable here. `sharp` (Next's own optional peer dep for image
optimization, unused in this codebase so far) and an old bundled `postcss@8.4.31`
(also Next's internal copy, unrelated to the project's own `postcss@8.5.24` via
Tailwind) are both pre-existing surface from Next itself, not from this change; `npm
audit fix --force`'s suggested remedy is downgrading Next to `9.3.3`, which would be
far more damaging than the advisories themselves. The one genuinely install-related
item, `brace-expansion` via ESLint's own transitive `minimatch`, is already on the
patched `5.0.8` — the audit's merged range display made it look otherwise. All of this
is dev-tooling-only; nothing here ships to the browser bundle.

**Next:** P2.7 (README's stale "no application code exists yet" claim).

---

## 2026-07-28 — Real Groq limits confirmed (resolves the last P0)

**Done:** Pulled real per-model limits from `console.groq.com` → Limits, logged in
`docs/AI-PIPELINE.md` §7. Both open items from the very first planning session (below,
2026-07-28 — Planning session) are now closed:

- `whisper-large-v3-turbo` and `llama-3.3-70b-versatile` are both current, neither
  deprecated.
- Real ceilings — `whisper-large-v3-turbo`: 20 req/min, 2,000 req/day, 7,200
  audio-sec/hour, 28,800 audio-sec/day. `llama-3.3-70b-versatile`: 30 req/min, 1,000
  req/day, 12,000 tokens/min, **100,000 tokens/day** (the old `400000` placeholder in
  `.env.example` was 4x over the real cap, not just imprecise). `llama-3.1-8b-instant`
  (Ask): 30 req/min, 14,400 req/day, 6,000 tokens/min, 500,000 tokens/day.

**Bigger finding than the daily mismatch:** the 12,000-tokens/minute cap on
`llama-3.3-70b-versatile` is far tighter than anything the docs accounted for. A
single analysis call for a 1-hour meeting (~26k input tokens, per the existing §7 cost
table) exceeds it on its own — independent of daily budget remaining, independent of
the 128k context window. The old map-reduce trigger (60,000 tokens) was sized against
context-window safety, which is the wrong constraint; it let the common case
(single-pass) fail against a limit it never checked. Corrected in `AI-PIPELINE.md` §3:
map-reduce now triggers at ~5,000 tokens, sized against the real rate limit, with
proportionally smaller map windows (4,000 tokens vs. the old 15,000). Also documented
the parallel gap on the ASR side (7,200 audio-sec/hour, tighter than daily-only
tracking would catch).

**Updated:** `.env.example` (real `GROQ_DAILY_*` defaults), `AI-PIPELINE.md` §3 and §7,
`ROADMAP.md` M0.11 and M3.4, `GAP-ANALYSIS.md` P0.5.

**Still open, for whoever builds `lib/quota.ts` (M2.9, doesn't exist yet):** it must
track per-minute and per-hour usage, not just daily sums, or a call can pass the daily
check and still get 429'd by Groq. This is a spec correction, not a code fix — there is
no `lib/quota.ts` yet to have gotten wrong.

**All five P0 items from `docs/GAP-ANALYSIS.md` are now resolved.** Next is P2:
`npm run lint` is broken (no ESLint installed), and the README still claims "no
application code exists yet."

---

## 2026-07-28 — CI workflow

**Done:** `.github/workflows/ci.yml` — typecheck + build on every push to `main` and
every PR. Node 22, `npm ci` + cached install. Runs the exact commands verified locally
(`npm run typecheck`, `npm run build`), both green.

Lint and unit test steps deliberately left out rather than stubbed: `npm run lint` is
currently broken (P2.1, no ESLint installed) and there's no test runner yet (P2.9).
Adding either as a no-op step would just mean removing it again later — better to add
each step when it has something real to check.

`APP_URL` repo variable set to `https://sync-mind-three.vercel.app` (Settings → Actions
→ Variables), and `keepalive.yml` triggered manually to confirm end to end: ping step
hit the real health endpoint, heartbeat commit landed on `main`. P0.2/P0.3/P0.4 are now
all fully live, not just merged.

**Next:** P2.1 (ESLint) or P2.7 (README still says "no application code exists yet") —
both small, both unblock things (2.1 unblocks CI's lint step; 2.7 is the first thing
anyone sees on the repo).

---

## 2026-07-28 — ffmpeg threading locked + APP_URL wired to the live deploy

**Discovered mid-session:** Vercel was already connected, live at
`https://sync-mind-three.vercel.app/`. Confirmed by curling `/api/health` from the
previous commit — it returned a real deployed commit SHA, proving both prior commits
were already pushed and live. This retroactively resolves P2.6 from
`docs/GAP-ANALYSIS.md` ("not connected to Vercel yet") and unblocks the `APP_URL` repo
variable `keepalive.yml` was built to read but had nothing to point at.

**Done:**
- P0.4 locked, docs-only: `ARCHITECTURE.md` §3.4 and `ROADMAP.md` M1.7 now pin
  `@ffmpeg/core` (single-threaded) over `@ffmpeg/core-mt`, so the M1 chunker build
  doesn't default into needing site-wide COOP/COEP headers. No code changed — ffmpeg
  isn't installed yet, this only locks the decision before that work starts.
- `APP_URL` GitHub Actions repo variable set to the live URL, so `keepalive.yml`'s
  ping step does a real health check instead of no-op skipping. Triggered once
  manually to confirm end to end.
- `docs/GAP-ANALYSIS.md` updated: Deploy row now reflects the live URL, P0.4 marked
  resolved, suggested order of work re-sequenced now that P0.1/P0.2/P0.4/P2.6 are all
  done.

**Still open:** P0.5 (verify real Groq limits — needs the user's Groq console, not
blocking anything else). P2.1 (ESLint), P2.2 (`ci.yml`), P2.7 (README still claims
"Pre-build, no application code exists yet" — false).

**Next:** P2.1 + P2.2 + P2.7 are all small and fully actionable now.

---

## 2026-07-28 — Keepalive workflow (fixes GitHub's 60-day scheduled-workflow auto-disable)

**Done:** P0.2 from `docs/GAP-ANALYSIS.md`. GitHub disables `schedule:` workflows after
60 days with no repository *push* activity — a scheduled run doesn't count, only a
`git push` does. A finished portfolio project sees no pushes for 60+ days, so any
naive keepalive/sweep cron eventually goes silently dark, Supabase pauses next (7 idle
days), and the live link 500s for anyone who clicks it.

Added:
- `app/api/health/route.ts` — trivial health check, no secrets, no DB call yet (there
  is no DB). Returns status/timestamp/commit SHA. Extension point for P1: add a
  `select 1` once Supabase exists.
- `.github/workflows/keepalive.yml` — runs every 3 days. Pings `/api/health` via a
  repo variable `APP_URL` (no-ops with a log line if unset — not deployed yet). Then
  writes a timestamp to `.github/heartbeat` and commits + pushes it. **That commit is
  the actual fix** — it resets GitHub's 60-day clock regardless of deploy state, so it
  works today and keeps working forever untouched.
- `docs/DEPLOYMENT.md` §8 — documents setting `APP_URL` once Vercel is connected, plus
  a redundant cron-job.org pinger as a one-time manual step (independent failure
  domain from GitHub Actions).

**Still open:** `APP_URL` is unset until Vercel is connected (P2.6). `ci.yml` and
`sweep.yml` remain unbuilt — sweep needs the pipeline state machine (P1/M2), which
doesn't exist yet.

**Next:** P0.3 is now mechanically covered by the same workflow once `APP_URL` is set;
remaining P0 items are P0.4 (`ffmpeg.wasm` threading decision) and P0.5 (verify real
Groq limits).

---

## 2026-07-28 — Gap analysis + M4 rebuilt without Google APIs

**Done:** Full-repo gap scan (`docs/GAP-ANALYSIS.md`, new file) against the stated goal
of a live, $0, portfolio-ready deploy. Six P0 zero-cost-constraint breaks identified;
fixed the first one end to end.

**Decision: drop `gmail.compose` + `calendar.events` OAuth entirely.**

Reasoning: Google's Testing-mode refresh tokens expire every 7 days, and leaving
Testing mode for a restricted scope (`gmail.compose`) requires a paid third-party
security assessment — both incompatible with an always-free, always-on project nobody
is paid to babysit. Replaced with:

- `lib/export/gmail.ts` — Gmail compose deep link (`mail.google.com/mail/?view=cm`),
  `mailto:` fallback, plain-text clipboard copy, an over-length guard for Gmail's URL
  truncation.
- `lib/export/ics.ts` — hand-rolled RFC 5545 builder (75-octet line folding, `\,;`
  escaping, all-day `VEVENT`s), single and bulk download.

Wired into `EmailComposer` ("Open this in Gmail" / "Copy it instead") and `TodoTable`
("Save the date" / "Put all N dates in my calendar"); `Todo.onCalendar` retired since
there is no server state to track. Settings, marketing copy, and all six docs
(`PRODUCT-REQUIREMENTS`, `ROADMAP` M4, `ARCHITECTURE`, `DATA-MODEL`, `SECURITY-PRIVACY`,
`DEPLOYMENT`) updated to match, plus `.env.example` (dropped `GOOGLE_TOKEN_ENC_KEY`,
no longer needed with no token to encrypt). Verified with Playwright: compose link
builds correctly, downloaded `.ics` parses as valid RFC 5545, no console errors.

Google sign-in itself is unaffected and unaffected by any of this — `email`/`profile`
are unrestricted scopes, ship straight to Production, no verification, no user cap.

**Next:** P0.2 (GitHub Actions cron dies after 60 days idle) or P0.4 (`ffmpeg.wasm`
threading decision) — see `docs/GAP-ANALYSIS.md` for the full list, ordered.

---

## 2026-07-28 — Planning session

**Done:** Full pre-build documentation set created. No application code written.

**Decisions locked:**

| Decision | Choice | Reasoning |
| --- | --- | --- |
| Transcription | Groq `whisper-large-v3-turbo` | Fastest free ASR with segment timestamps. Alternatives considered: browser-side transformers.js (unlimited but slow on weak devices, large model download), Gemini audio input (simpler pipeline but tighter free limits). |
| Backend | Supabase free tier | Postgres + Auth + Storage + RLS in one product. Alternatives: Neon + Auth.js (no bundled storage), local-first IndexedDB (no sync, no calendar, no sharing). |
| Integrations | Google OAuth — Calendar events + Gmail **drafts** | `gmail.compose` rather than `gmail.send` so the app is technically incapable of sending on the user's behalf. |
| Hosting | Vercel Hobby | Free, first-class Next.js. Accepts the 60s function cap and non-commercial terms. |
| LLM | Groq `llama-3.3-70b-versatile`, Gemini `2.0-flash` fallback | Structured extraction quality at zero cost, with a second provider for outages and daily-limit exhaustion. |
| Background work | Client-driven poll + short `advance` calls | No free always-on worker exists. State lives in Postgres, so work is resumable rather than lost. |
| Retention | 7-day audio auto-purge, user-adjustable 1-30 | 1 GB storage cap makes this a product policy, not a hidden job. |

**Files created:**
- `README.md`
- `docs/PRODUCT-REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA-MODEL.md`
- `docs/AI-PIPELINE.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/ROADMAP.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY-PRIVACY.md`
- `docs/ACTIVITY-LOG.md`
- `.gitignore`, `.env.example`

**Open items to resolve before or during M0:**
1. Confirm the Groq free-tier limits as published at build time (`console.groq.com` → Settings → Limits, per model) and tune the `GROQ_DAILY_*` defaults to match — **not conservative estimates, verify directly.** Third-party trackers checked 2026-07-28 suggest `llama-3.3-70b-versatile` free tier may be closer to ~1,000 req/day with a per-minute token cap in the low tens of thousands — much tighter than the current `GROQ_DAILY_LLM_TOKENS=400000` placeholder, and possibly tight enough that a single analysis call brushes the per-minute limit. See AI-PIPELINE §7 for the required tuning steps. Unconfirmed — official Groq console is the only trustworthy source, third-party pages are not authoritative.
2. Verify `whisper-large-v3-turbo` and `llama-3.3-70b-versatile` are still the current ids on the Groq models endpoint.
3. **Decided:** production domain is the Vercel-provided subdomain (`*.vercel.app`). No custom domain — that carries an annual registration cost, which breaks the $0 constraint. Not revisited unless the constraint itself is dropped.
4. **Decided:** GitHub repo stays **public**. GitHub Actions minutes are free and unlimited on public repos; a private repo caps free Actions minutes and could eventually push the keep-alive/sweep crons toward a paid tier. No private-data risk since the app has no secrets or user data in the repo (SECURITY-PRIVACY §9).

**Next:** M0 in `docs/ROADMAP.md` — repo init, Next.js scaffold, Supabase project, migrations, CI.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is right now

SyncMind is an AI meeting assistant (audio in → transcript, notes, to-dos, follow-up email, calendar entries), designed to run entirely on free tiers.

**Current state: front-end only.** Every screen renders from fixtures in [lib/mock/data.ts](lib/mock/data.ts). There is no Supabase client, no `app/api/**`, no `supabase/migrations/`, no AI calls, no auth. `docs/` describes the *target* system, not what exists. Do not assume a doc-described module exists — check first.

## Commands

```bash
npm run dev        # next dev, localhost:3000
npm run build      # next build
npm run typecheck  # tsc --noEmit  <- the real gate, run after any change
npm run lint       # eslint ., flat config in eslint.config.mjs, wired into CI
```

No test runner is installed. `docs/ARCHITECTURE.md` §10 plans Vitest (unit + integration) and Playwright (E2E); neither exists yet. If asked to add tests, that is new setup work, not a config tweak.

Verify UI changes in a real browser (Playwright MCP), not by build exit code.

## Architecture that matters

### Zero-cost constraints drive the design

Read `docs/ARCHITECTURE.md` §1 before proposing any backend work. The load-bearing consequences:

- **60s Vercel function cap** → no long-running request. The pipeline is split into resumable units, each advanced by one short call to `POST /api/pipeline/advance` (idempotent, Postgres-advisory-locked).
- **No always-on worker** → the *browser* drives the pipeline: poll status every 2s, call `advance`, repeat. Closing the tab pauses work, never fails it; all state lives in Postgres. A GitHub Actions sweep rescues stalled meetings.
- **25 MB Groq ASR limit** → audio is chunked client-side by `ffmpeg.wasm` into ~10-min 16kHz mono Opus segments with 3s overlap; chunks PUT directly to Supabase Storage, never proxied through Vercel. Whisper timestamps are chunk-relative and get offset-shifted server-side.
- **1 GB storage** → 7-day audio auto-purge is a product feature (user-adjustable 1-30 days), not a hidden job.
- **Groq daily ceilings** → `lib/quota.ts` pre-checks projected spend and sets `quota_blocked` rather than letting an upstream 429 happen.

`meetings.status` is the state machine (`draft → uploading → transcribing → analyzing → ready`, plus `failed` / `quota_blocked`). Partial results are always preserved; every failure carries a user-visible cause and a next action.

### Secrets boundary

`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENC_KEY`, `CRON_SECRET` may only be referenced in `app/api/**` or `lib/**` modules imported *by* those routes. Never in a `"use client"` file. Gmail uses `gmail.compose` scope only — the app must be technically incapable of sending mail.

### Routing (as built, diverges from docs)

- `app/page.tsx` — marketing landing (no `(marketing)` group).
- `app/(app)/` — dashboard, upload, tasks, settings, `meetings/[id]`.
- `app/(app)/meetings/[id]/page.tsx` is **one page with Tabs** (notes / transcript / to-dos / email / ask). `docs/ARCHITECTURE.md` §4 shows these as sub-routes. Follow the code.
- `docs` calls the cross-meeting board `actions/`; the code calls it `tasks/`.

Pages are Server Components and `await` the mock getters directly. Only interactive leaves are `"use client"`.

### Data layer swap contract

Every fixture in [lib/mock/data.ts](lib/mock/data.ts) is exposed behind an `async` getter matching the shape the real Supabase query will have (`getMeetings()`, `getMeeting(id)`, `getTranscript(meetingId)`, …). Keep those signatures — the backend swap should touch that one file. Types in [lib/types.ts](lib/types.ts) mirror the enums in `docs/DATA-MODEL.md`, so don't rename them casually.

Fixtures intentionally include the awkward cases (overdue to-do, guessed owners, purged audio, partly-failed meeting, "not in this recording" answer). Preserve them when editing.

## Design system: Room Tone

Tailwind v4, CSS-first. **There is no `tailwind.config.*`** — all tokens live in `@theme inline` in [app/globals.css](app/globals.css).

Three semantic colors carry the product's core honesty story. Use them by meaning, never as decoration, and never introduce raw hex/oklch in components:

| Token | Meaning |
| --- | --- |
| `said` (amber) | anything a human spoke — audio, waveform, timecodes, quotes |
| `done` (teal) | anything SyncMind produced — notes, to-dos, calendar. Primary actions are always teal. |
| `guessed` (lilac) | AI-inferred and unconfirmed. The honesty channel. |
| `overdue` (red) | past-due only |

Each has `-text` (darkened for WCAG AA as text) and `-soft` (tint) variants. Dark mode is a `.dark` class variant (`@custom-variant`, driven by next-themes) — not a media query; shadows collapse to `none` in dark and borders carry elevation.

Other conventions:
- Type scale is custom `@utility` classes: `text-display`, `text-h1`…`text-h3`, plus `tabular` for timecodes. Not Tailwind's `text-4xl`.
- Fonts in [app/fonts.ts](app/fonts.ts): Bricolage Grotesque (display), Instrument Sans (body), JetBrains Mono (timecodes only).
- Motion comes exclusively from [lib/motion.ts](lib/motion.ts) (`spring`, `micro`, `exit`, `press`, `rise`, `stagger`, `viewportOnce`) using `motion/react`. Motion explains cause and effect; it never decorates. `prefers-reduced-motion` is already handled globally in `globals.css`.
- Components use `cva` + `cn()` from [lib/utils.ts](lib/utils.ts), Radix primitives, function declarations (not `forwardRef`), and `ComponentProps<"x">` for props. Match [components/ui/button.tsx](components/ui/button.tsx).
- Focus rings are restyled, never removed.

Copy is plain-language and non-technical — status labels read "Writing it down", "Picking out the important bits" (see `statusCopy` in [lib/types.ts](lib/types.ts)). Keep that register.

`docs/DESIGN-SYSTEM.md` is referenced by the README but was deleted in commit db30f31; `app/globals.css` is now the source of truth.

## Docs

`docs/ROADMAP.md` holds the six milestones and is the entry point for "what's next" (M0-M1 partially done: scaffold + UI exist; Supabase, auth, CI do not). `PRODUCT-REQUIREMENTS.md`, `DATA-MODEL.md`, `AI-PIPELINE.md`, `DEPLOYMENT.md`, `SECURITY-PRIVACY.md` cover their titles.

`docs/ACTIVITY-LOG.md` is the running decision log — newest first, and it lists unresolved items (notably: Groq free-tier limits and model ids are unverified placeholders in `.env.example`). Append to it; do not auto-commit it.

New markdown files use ALL-CAPITALS filenames.

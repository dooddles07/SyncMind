# SyncMind — Activity Log

Running record of decisions and work. Newest first. Not auto-committed.

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

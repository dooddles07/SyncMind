# SyncMind — Security and Privacy

Meeting recordings are among the most sensitive content a person will upload. Salary talk, client terms, personnel decisions, medical detail — all of it can be in a file the user drags in without thinking. The bar is correspondingly high.

## 1. Data we hold

| Data | Where | Retention |
| --- | --- | --- |
| Audio chunks | Supabase Storage, private bucket | Auto-deleted after `retention_days` (default 7, user-settable 1-30). Pinned meetings are exempt. |
| Transcript | Postgres | Until the user deletes the meeting |
| Minutes, action items, email drafts | Postgres | Until the user deletes the meeting |
| Email, name, avatar | Postgres, from Google sign-in | Until account deletion |
| Usage counters | Postgres, per user per day | 90 days |

We do not store Google refresh or access tokens — there are none to store. Sign-in is
the only Google interaction; Gmail and Calendar are external destinations we hand
finished text to (a compose link, a downloaded file), never a service we authenticate
against. See §4. We also do not store passwords (there are none — OAuth only), or
payment data (there is none).

## 2. Authorization

Row Level Security is the boundary. Every table has RLS enabled with an owner-only policy; the application layer is a convenience, not a gate. A bug in a route handler cannot leak another user's meeting because the query itself returns zero rows.

The service-role key bypasses RLS and is used in exactly three places:

1. The public share page — scoped by an explicit token lookup to one `meeting_id`.
2. `/api/cron/*` — bearer-guarded by `CRON_SECRET`.
3. Pipeline storage reads during transcription.

Every other server path uses the request-scoped user client. Any new service-role usage requires a stated reason in review.

**Test that proves it:** an integration test signs in as user B and requests user A's meeting by ID through every route. All must return 404, and the direct table query must return zero rows.

## 3. Secrets

- Server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`) are referenced only from `app/api/**` and server modules. CI greps `"use client"` files for these names and fails the build on a hit.
- `.env*` is gitignored except `.env.example`, which contains names and no values.
- Rotation: any suspected exposure means rotate at the provider, update Vercel, redeploy, and log it in ACTIVITY-LOG.

## 4. Google scopes

SyncMind requests exactly one thing from Google: identity, to sign in.

| Scope | Why | What it cannot do |
| --- | --- | --- |
| `userinfo.email`, `userinfo.profile`, `openid` | Identity, for sign-in | — |

`gmail.compose` and `calendar.events` are never requested. There is no Google API
integration for email or calendar at all — the follow-up email opens as a pre-filled
draft in the user's own Gmail via a compose link (`mail.google.com/mail/?view=cm`), and
calendar entries are a downloadable `.ics` file. Neither path authenticates to Google on
the app's behalf, so there is no token to hold, encrypt, or revoke, and no "disconnect
Google" action needed — see `docs/GAP-ANALYSIS.md` P0.1 for why this replaced the
original OAuth design.

## 5. Share links

- Token is 32 bytes from `crypto.randomBytes`, base64url — not guessable, not sequential, not derived from the meeting ID.
- Share pages send `X-Robots-Tag: noindex, nofollow` and a matching meta tag.
- Transcript inclusion is opt-in per link; the default share exposes minutes and action items only.
- Revocation is immediate — `revoked_at` is checked on every request, with no caching of the page.
- Optional expiry. Links are listed in the meeting's Share menu with their view counts so the user can see what is public.

## 6. Third-party processing

Audio is sent to Groq for transcription; transcript text is sent to Groq (or Gemini on fallback) for analysis. This must be stated plainly on the landing page and in Settings, not buried. Neither provider is used as a storage service — we upload, receive a result, and retain nothing on their side beyond their own operational logs, which is a limitation the user should know about before uploading a confidential recording.

No analytics vendor receives transcript content. Error reports to Sentry are scrubbed: no transcript text, no meeting titles, no email bodies — IDs only.

Application logs record model, latency, token counts, and error codes. They never record transcript content, prompt bodies, or generated text.

## 7. Deletion

**Delete a meeting** removes the storage objects first, then the `meetings` row; every child table cascades. If storage deletion fails, the operation aborts and reports, rather than orphaning audio behind a deleted database row.

**Delete all my data** in Settings deletes every meeting and the `auth.users` row, which cascades the profile. It is behind a typed confirmation.

Deletion is immediate and irreversible. There is no soft-delete and no recovery window, and the confirmation dialog says so.

## 8. Application security

- All mutations go through route handlers that verify the session; there are no unauthenticated write paths except `/api/health` (read-only) and `/api/cron/*` (bearer-guarded).
- Input validated with Zod at every route boundary. Rejected input returns 400 with a code, never an echo of the payload.
- Uploads are validated on MIME type and duration client-side, and the storage path is derived server-side from the authenticated user ID — a client cannot choose where its file lands.
- Rate limits: 20 Ask queries per meeting per day, and the daily quota ceilings in AI-PIPELINE §7 bound everything else.
- CSP set in `next.config.ts`, restricted to self plus the Supabase origin, with `wasm-unsafe-eval` required by `ffmpeg.wasm`. COOP/COEP are set for cross-origin isolation.
- No `dangerouslySetInnerHTML` on model output. Markdown is rendered through a sanitizing renderer with a strict allowlist. Model output is untrusted input — a recording could contain someone reading out an injection attempt, and prompt output must never be treated as instructions or as safe HTML.

## 9. Repository rules

Per the project's global instructions:

- No real customer personal data in the repo — no names, contacts, account numbers, or transactions. Test fixtures use invented people and invented companies.
- No credentials in the repo — no passwords, API keys, tokens, or connection strings, including in comments, tests, or documentation examples.
- Real recordings are never committed. Fixtures are short, synthetic, and cleared for public distribution.

## 10. What we promise users

Stated in the product, in this wording:

- Your recordings are private to your account.
- Audio is deleted automatically after 7 days. You can change that or pin a meeting to keep it.
- Transcription and analysis are performed by Groq. Nothing is used to train a model by us.
- SyncMind never touches your email or calendar accounts. It hands your follow-up to your own Gmail and your due dates to a file you open yourself.
- You can delete any meeting, or everything, at any time. Deletion is immediate and permanent.

Anything we cannot honestly say we do not say. If a claim here stops being true, the copy changes in the same commit as the behavior.

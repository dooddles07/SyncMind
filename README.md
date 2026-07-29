# SyncMind

**Meetings in. Momentum out.**

SyncMind is an AI meeting assistant. Upload a meeting recording and get back a clean transcript, structured minutes, extracted action items, a ready-to-send follow-up email, and calendar entries for every deadline. Post-meeting admin drops from ~20 minutes to under 2.

Built to run entirely on free tiers: Next.js on Vercel, Supabase for data and auth, Groq for transcription and reasoning. Email and calendar are a Gmail compose link and a downloadable `.ics` file — no Google API, no OAuth beyond sign-in.

## Status

**Live and fully built:** [sync-mind-three.vercel.app](https://sync-mind-three.vercel.app/)

Real end-to-end pipeline, not a fixture shell: Supabase Postgres + Auth + Storage,
Google OAuth sign-in, Groq Whisper transcription, Llama-based minutes/action-item
extraction and follow-up email drafting, Gmail compose links and `.ics` calendar
export, resumable upload/processing that survives a closed tab. Covered by real
tests — Vitest unit tests, a Groq eval harness (`npm run eval`) scoring analysis
quality against hand-labeled fixtures, and a Playwright E2E suite exercising the
full upload → ready → share flow, all green in CI. `docs/GAP-ANALYSIS.md` is the
actively-maintained record of what was built and verified, session by session.

## Documentation

| Document | What it covers |
| --- | --- |
| [PRODUCT-REQUIREMENTS.md](docs/PRODUCT-REQUIREMENTS.md) | Problem, personas, goals, non-goals, feature scope, user stories, flows |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, processing pipeline, API contracts, folder layout, failure handling |
| [DATA-MODEL.md](docs/DATA-MODEL.md) | Postgres schema, enums, indexes, RLS policies, storage buckets |
| [AI-PIPELINE.md](docs/AI-PIPELINE.md) | Chunking, prompts, JSON schemas, validation, model fallback, budgets |
| [app/globals.css](app/globals.css) | Design system source of truth (Room Tone) — tokens, type scale, motion. `docs/DESIGN-SYSTEM.md` was deleted; the code is now the doc, see `CLAUDE.md` |
| [ROADMAP.md](docs/ROADMAP.md) | Six milestones with tasks, exit criteria, estimates, risk register |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Account setup, env vars, local dev, migrations, deploy, OAuth config, rollback |
| [SECURITY-PRIVACY.md](docs/SECURITY-PRIVACY.md) | Retention, RLS boundary, secrets, share links, deletion, scope minimization |
| [GAP-ANALYSIS.md](docs/GAP-ANALYSIS.md) | What's actually built vs. planned, prioritized (P0-P3), updated every session |
| [ACTIVITY-LOG.md](docs/ACTIVITY-LOG.md) | Running log of decisions and work sessions |

## Stack at a glance

Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Motion · Supabase (Postgres + Auth + Storage) · Groq (`whisper-large-v3-turbo`, `llama-3.3-70b-versatile`) · Vercel Hobby · GitHub Actions

Total running cost: **$0**. Every limit and its workaround is documented in `docs/DEPLOYMENT.md`.

## Quickstart

```bash
git clone https://github.com/dooddles07/SyncMind.git && cd SyncMind && npm install
```

Needs a real Supabase project and API keys to run the full app — this isn't a
fixture demo. Copy `.env.example` to `.env.local` and fill it in, then:

```bash
supabase link --project-ref <ref> && supabase db push   # apply migrations
npm run dev
```

`docs/DEPLOYMENT.md` has the full walkthrough: creating the Supabase/Groq/Google
accounts, where each env var comes from, the storage bucket + RLS setup, and
Vercel deploy steps. All of it runs on free tiers, $0 total.

```bash
npm test        # Vitest unit tests
npm run test:e2e  # Playwright E2E (needs E2E_TEST_SECRET in .env.local)
npm run eval     # Groq analysis-quality eval harness (spends real Groq tokens)
```

## Repository

`https://github.com/dooddles07/SyncMind`

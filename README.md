# SyncMind

**Meetings in. Momentum out.**

SyncMind is an AI meeting assistant. Upload a meeting recording and get back a clean transcript, structured minutes, extracted action items, a ready-to-send follow-up email, and calendar entries for every deadline. Post-meeting admin drops from ~20 minutes to under 2.

Built to run entirely on free tiers: Next.js on Vercel, Supabase for data and auth, Groq for transcription and reasoning. Email and calendar are a Gmail compose link and a downloadable `.ics` file — no Google API, no OAuth beyond sign-in.

## Status

**Live:** [sync-mind-three.vercel.app](https://sync-mind-three.vercel.app/)

The UI is complete and deployed, running entirely on fixture data from
[lib/mock/data.ts](lib/mock/data.ts) — there is no Supabase, no AI calls, and no auth
yet. What you see live is the real interface with no backend behind it. See
`docs/ROADMAP.md` for what's built (M0 substantially done) versus what's next (M1
onward), and `docs/GAP-ANALYSIS.md` for the current, actively-maintained punch list.

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

```bash
npm run dev
```

That's enough to run the full UI locally against fixtures — no `.env.local` needed yet.
`.env.example` documents the variables the backend will read once it exists (Supabase,
Groq, Google sign-in); filling them in today does nothing, since nothing reads them.
See `docs/DEPLOYMENT.md` for what each one is for when that work starts.

## Repository

`https://github.com/dooddles07/SyncMind`

# SyncMind

**Meetings in. Momentum out.**

SyncMind is an AI meeting assistant. Upload a meeting recording and get back a clean transcript, structured minutes, extracted action items, a ready-to-send follow-up email, and calendar entries for every deadline. Post-meeting admin drops from ~20 minutes to under 2.

Built to run entirely on free tiers: Next.js on Vercel, Supabase for data and auth, Groq for transcription and reasoning. Email and calendar are a Gmail compose link and a downloadable `.ics` file — no Google API, no OAuth beyond sign-in.

## Status

Pre-build. Planning documents are complete; no application code exists yet. Start at `docs/ROADMAP.md`, milestone M0.

## Documentation

| Document | What it covers |
| --- | --- |
| [PRODUCT-REQUIREMENTS.md](docs/PRODUCT-REQUIREMENTS.md) | Problem, personas, goals, non-goals, feature scope, user stories, flows |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, processing pipeline, API contracts, folder layout, failure handling |
| [DATA-MODEL.md](docs/DATA-MODEL.md) | Postgres schema, enums, indexes, RLS policies, storage buckets |
| [AI-PIPELINE.md](docs/AI-PIPELINE.md) | Chunking, prompts, JSON schemas, validation, model fallback, budgets |
| [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Brand, tokens, typography, components, motion, accessibility, screen wireframes |
| [ROADMAP.md](docs/ROADMAP.md) | Six milestones with tasks, exit criteria, estimates, risk register |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Account setup, env vars, local dev, migrations, deploy, OAuth config, rollback |
| [SECURITY-PRIVACY.md](docs/SECURITY-PRIVACY.md) | Retention, RLS boundary, secrets, share links, deletion, scope minimization |
| [ACTIVITY-LOG.md](docs/ACTIVITY-LOG.md) | Running log of decisions and work sessions |

## Stack at a glance

Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Motion · Supabase (Postgres + Auth + Storage) · Groq (`whisper-large-v3-turbo`, `llama-3.3-70b-versatile`) · Vercel Hobby · GitHub Actions

Total running cost: **$0**. Every limit and its workaround is documented in `docs/DEPLOYMENT.md`.

## Quickstart (once M0 lands)

```bash
git clone https://github.com/dooddles07/SyncMind.git && cd SyncMind && npm install && cp .env.example .env.local
```

Fill `.env.local` using the table in `docs/DEPLOYMENT.md`, then:

```bash
npm run dev
```

## Repository

`https://github.com/dooddles07/SyncMind`

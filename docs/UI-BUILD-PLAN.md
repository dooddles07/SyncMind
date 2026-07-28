# SyncMind — UI Build Plan

Scope agreed 2026-07-28: **foundation + components + screens**. No backend.

In scope: Next.js scaffold, design tokens, fonts, theming, shadcn/ui primitives, all 13 product components, all 8 routes rendering with mock data.

Out of scope for now: Supabase auth and RLS, chunked upload pipeline, Groq transcription and analysis, Gmail draft and Calendar integration. Every data-fetching seam should be a typed function returning mock data so the backend can be dropped in later without touching components.

Source of truth for visuals: the Figma file `hgVbn1fdh7xkw9gkg64HF2` and `docs/DESIGN-SYSTEM.md`. Where they disagree, the Figma file wins — it carries corrections the doc does not (see Corrections below).

---

## Continuation prompt

> Build the SyncMind UI. Read `docs/UI-BUILD-PLAN.md` first, then `docs/DESIGN-SYSTEM.md` and `docs/ARCHITECTURE.md` section 4. Scope is foundation + components + screens with mock data, no backend. Work in the order given in the plan and verify each phase before moving on.

---

## Progress

**Phase 1 — foundation: DONE and verified 2026-07-28.**

Scaffolded manually rather than with `create-next-app`, because the repo already had `README.md`, `LICENSE`, `.gitignore`, `.env.example` and `docs/` that the generator would have clobbered.

Files in place: `package.json` · `tsconfig.json` · `next.config.ts` · `postcss.config.mjs` · `app/globals.css` · `app/fonts.ts` · `app/layout.tsx` · `app/page.tsx` (placeholder) · `app/foundations/page.tsx` (token proof) · `components/theme-provider.tsx` · `components/theme-toggle.tsx` · `lib/utils.ts` · `.claude/launch.json`.

Verified: `tsc --noEmit` clean, `next build` clean, and all **44 token assertions pass** — 22 tokens × 2 modes, compared as rendered sRGB against the values in this plan.

Note for whoever verifies next: Chrome preserves `oklch()` in `getComputedStyle`, it does not convert to `rgb()`. Comparing the computed string to a hex will produce 44 false failures. Rasterise the resolved colour to a 1×1 canvas and read the pixel instead. There is a working assertion script pattern in the session history.

**Phase 2 — components: PARTIAL.**

Built and verified: `lib/types.ts` (all enums from DATA-MODEL, plus `isOverdue`, `formatTimestamp`, `formatDuration`) · `components/ui/button.tsx` (5 variants × 3 sizes, loading, disabled, icon) · `components/ui/badge.tsx` (6 variants, optional dot) · `components/ui/card.tsx` · `components/ui/skeleton.tsx` · `components/ui/empty-state.tsx` · `components/meeting/status-stepper.tsx` (all 7 `MeetingStatus` values) · `app/gallery/page.tsx`.

`@radix-ui/react-slot` added for Button's `asChild`.

Verified: `tsc --noEmit` clean, `next build` clean (4 static routes), gallery renders every section and all 7 stepper states with their status words.

**Bug found and fixed during verification:** `ThemeToggle` gated its icon on `mounted` but not its `aria-label`, so the server rendered "Switch to dark mode" and the client replaced it on hydration. That is both a React hydration error and a screen reader announcing the wrong action. Anything derived from `resolvedTheme` must stay stable until after mount — icon *and* label. Server now emits a neutral "Toggle theme".

**Still to build in Phase 2 — 14 primitives:** Input · Textarea · Select · Checkbox · Switch · Dialog · Sheet · DropdownMenu · Tabs · Tooltip · Avatar · Separator · Progress · Toast (sonner) · AlertDialog · Command.

**Still to build — 12 product components:** Dropzone · ChunkProgress · AudioPlayer · TranscriptList · SpeakerChip · MinutesEditor · ActionTable · EmailComposer · AskPanel · KanbanBoard · QuotaBanner.

Extend `app/gallery/page.tsx` as each lands. Behaviour specs for all of them are in the Phase 2 table below.

**Phase 3 — screens: not started.**

Delete `app/foundations/page.tsx` once Phase 3 lands.

---

## Stack

- Next.js 15, App Router, TypeScript, React 19
- Tailwind CSS **v4** — tokens declared in `app/globals.css` under `@theme`, not in a JS config
- shadcn/ui (Radix primitives), `lucide-react` icons only
- `next-themes` for light/dark/system, no flash on first paint
- `sonner` for toasts, `dnd-kit` for the kanban
- `next/font/google` for all three families, self-hosted at build time

---

## Phase 1 — Foundation

### 1.1 Scaffold

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"
npx shadcn@latest init
```

### 1.2 Tokens — `app/globals.css`

Declare under `@theme`. These values are verified against the Figma file; the hex is the sRGB conversion of the OKLCH source.

```css
@theme {
  --color-background:         oklch(0.99 0.002 250);   /* #fbfcfd */
  --color-foreground:         oklch(0.21 0.01 255);    /* #15191d */
  --color-card:               oklch(1 0 0);            /* #ffffff */
  --color-card-foreground:    oklch(0.21 0.01 255);    /* #15191d */
  --color-muted:              oklch(0.965 0.004 250);  /* #f1f4f6 */
  --color-muted-foreground:   oklch(0.52 0.012 255);   /* #646970 */
  --color-border:             oklch(0.92 0.005 250);   /* #e2e5e8 */
  --color-input:              oklch(0.92 0.005 250);   /* #e2e5e8 */
  --color-primary:            oklch(0.52 0.11 195);    /* #007c7c */
  --color-primary-foreground: oklch(0.99 0.002 250);   /* #fbfcfd */
  --color-accent:             oklch(0.95 0.02 195);    /* #e0f3f3 */
  --color-accent-foreground:  oklch(0.36 0.09 195);    /* #004b4c */
  --color-ring:               oklch(0.52 0.11 195);    /* #007c7c */
  --color-success:            oklch(0.60 0.13 155);    /* #2c965d */
  --color-warning:            oklch(0.72 0.14 75);     /* #d79628 */
  --color-destructive:        oklch(0.58 0.19 27);     /* #d33b36 */
  --color-info:               oklch(0.58 0.12 250);    /* #3c7ebe */

  /* Derived. Required for WCAG AA — see Corrections. Text and control borders only. */
  --color-success-text:       oklch(0.525 0.13 155);   /* #007f47 */
  --color-warning-text:       oklch(0.545 0.14 75);    /* #9e6100 */
  --color-destructive-text:   oklch(0.565 0.19 27);    /* #ce3631 */
  --color-info-text:          oklch(0.54 0.12 250);    /* #2f72b1 */
  --color-input-strong:       oklch(0.640 0.005 250);  /* #8a8c8f */

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;
}

.dark {
  --color-background:         oklch(0.17 0.008 255);   /* #0d1013 */
  --color-foreground:         oklch(0.95 0.004 250);   /* #eceff1 */
  --color-card:               oklch(0.21 0.009 255);   /* #16191c */
  --color-card-foreground:    oklch(0.95 0.004 250);   /* #eceff1 */
  --color-muted:              oklch(0.25 0.009 255);   /* #1f2226 */
  --color-muted-foreground:   oklch(0.67 0.012 255);   /* #90969d */
  --color-border:             oklch(0.29 0.01 255);    /* #282c30 */
  --color-input:              oklch(0.29 0.01 255);    /* #282c30 */
  --color-primary:            oklch(0.72 0.11 195);    /* #36baba */
  --color-primary-foreground: oklch(0.17 0.008 255);   /* #0d1013 */
  --color-accent:             oklch(0.28 0.04 195);    /* #0b2f2f */
  --color-accent-foreground:  oklch(0.85 0.08 195);    /* #8ddfde */
  --color-ring:               oklch(0.72 0.11 195);    /* #36baba */
  --color-success:            oklch(0.70 0.13 155);    /* #51b67a */
  --color-warning:            oklch(0.79 0.14 75);     /* #efac44 */
  --color-destructive:        oklch(0.65 0.18 27);     /* #e8594f */
  --color-info:               oklch(0.68 0.12 250);    /* #5b9ddf */

  /* Dark already clears AA, so the -text tokens mirror their base. */
  --color-success-text:       oklch(0.70 0.13 155);
  --color-warning-text:       oklch(0.79 0.14 75);
  --color-destructive-text:   oklch(0.65 0.18 27);
  --color-info-text:          oklch(0.68 0.12 250);
  --color-input-strong:       oklch(0.530 0.010 255);  /* #686c72 */
}
```

Spacing uses Tailwind's default 4px scale. The design uses steps 1, 2, 3, 4, 6, 8, 12, 16, 24 — that is 4px through 96px. No custom spacing scale is needed.

### 1.3 Elevation

```css
--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
--shadow-md: 0 4px 12px oklch(0 0 0 / 0.07);
--shadow-lg: 0 12px 32px oklch(0 0 0 / 0.10);
```

Shadows are **light mode only**. In dark mode drop the shadow and raise the border one step instead. Build this as a variant on the component, not a per-instance override.

### 1.4 Type

```ts
// app/fonts.ts
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
export const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-display" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

| Token | Size / line-height | Tracking | Family | Use |
| --- | --- | --- | --- | --- |
| `display` | 56 / 1.05 | -0.03em | Inter Tight | Landing hero |
| `h1` | 32 / 1.15 | -0.02em | Inter Tight | Page title |
| `h2` | 24 / 1.25 | -0.015em | Inter Tight | Section |
| `h3` | 18 / 1.35 | -0.01em | Inter Tight | Card title |
| `body` | 15 / 1.6 | 0 | Inter | Default |
| `sm` | 14 / 1.5 | 0 | Inter | Secondary |
| `xs` | 13 / 1.4 | 0.005em | Inter | Meta, badges |
| `mono` | 14 / 1.7 | 0 | JetBrains Mono | Timestamps, tabular figures |
| `transcript` | 15 / 1.7 | 0 | Inter | Transcript text, `max-width: 68ch` |

Timestamps need `font-variant-numeric: tabular-nums` so rows do not jitter.

### 1.5 Theming

`next-themes` with `attribute="class"`, `defaultTheme="system"`, and `suppressHydrationWarning` on `<html>`. Verify no flash on hard reload in both modes.

**Phase 1 exit:** a page rendering one swatch per token in both modes, all values matching the table above.

---

## Phase 2 — Components

Build in this order. Atoms before molecules. Every interactive component needs `default`, `hover`, `focus-visible`, `active`, `disabled`, and `loading` where it applies.

### 2.1 Primitives — `components/ui/`

Take from shadcn, then re-skin to the tokens: Button, Input, Textarea, Select, Checkbox, Switch, Badge, Card, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Avatar, Separator, Skeleton, Progress, Toast (sonner), AlertDialog, Command.

Two deviations from stock shadcn, both deliberate:
- Field and control borders use `--color-input-strong`, not `--color-input`. `input` is 1.23:1 and fails WCAG 1.4.11.
- Focus is `outline: 2px solid var(--color-ring); outline-offset: 2px`. Never `ring-offset-background` tricks, never removed.

Button axes: `variant` primary | secondary | ghost | destructive | outline · `size` sm | md | lg · `icon` boolean.

### 2.2 Product components

| Component | Path | Behaviour that matters |
| --- | --- | --- |
| `Dropzone` | `components/upload/dropzone.tsx` | Full-area drag target. States: idle, drag-over, rejected-type, rejected-duration, wasm-unavailable. Every rejection states cause and next step. |
| `ChunkProgress` | `components/upload/chunk-progress.tsx` | Per-part rows. Each row carries a **status word** beside its bar, never colour alone. |
| `StatusStepper` | `components/meeting/status-stepper.tsx` | Horizontal desktop, vertical mobile. One state per `meetings.status`. Each stage has an icon **and** a status word. Active dot pulses 2s; static under reduced motion. Renders `stage_detail` verbatim. |
| `AudioPlayer` | `components/meeting/audio-player.tsx` | Sticky at pane bottom. Play/pause, back/forward **15** (label the number, an icon alone does not convey the interval), speed 1x-2x, scrubber. Keys: space, left, right. Announce rate and position on change. Purged state replaces the player with a plain notice. |
| `TranscriptList` | `components/meeting/transcript-list.tsx` | Virtualize past 200 rows. Row = mono timestamp **button** + speaker chip + utterance. Playing row gets a 3px left accent bar plus accent background. Search highlights matches with next/prev. |
| `SpeakerChip` | same file | Coloured initial + name. AI-derived names keep an amber dot **and** the words "AI-inferred" until confirmed. Click opens rename, applies across the meeting. |
| `MinutesEditor` | `components/meeting/minutes-editor.tsx` | Overview / Key topics / Decisions / Open questions. Click to edit in place, save on blur, subtle "Edited" marker once touched. Each item carries its timestamp, which seeks the player. |
| `ActionTable` | `components/meeting/action-table.tsx` | Inline-editable: title, owner, due, priority, status. **Read and edit rows must be the same height** so nothing jumps. Overdue rows get a red left border, a red date, **and** an "Overdue" pill. Header columns must share the data-row grid. |
| `EmailComposer` | `components/meeting/email-composer.tsx` | Tone segmented control, editable subject, markdown body, recipient chips. Copy states plainly that SyncMind creates a draft and cannot send. Tone switch warns before discarding manual edits. |
| `AskPanel` | `components/meeting/ask-panel.tsx` | Question input, answer card, citation chips that seek the player. No-answer response is verbatim: "That does not appear in this meeting's transcript." |
| `KanbanBoard` | `components/actions/kanban-board.tsx` | Three columns, dnd-kit. **Every card also carries a visible status select** — drag is never the only path. Columns equal height. |
| `QuotaBanner` | `components/ui/quota-banner.tsx` | Shows only at `quota_blocked` or above 80% of the daily ceiling. Always states the limit and the reset time. |
| `EmptyState` | `components/ui/empty-state.tsx` | Illustration-free: short heading, one sentence, one action. |

**Phase 2 exit:** a component gallery route rendering every component in every state, both modes, checked against the Figma page `02 · Components`.

---

## Phase 3 — Screens

Routes per `ARCHITECTURE.md` section 4. All read from `lib/mock/` — typed functions with the same signatures the real data layer will have.

| Route | Notes |
| --- | --- |
| `app/(marketing)/page.tsx` | Hero, single CTA, product still, 4-step flow, three benefits, privacy line. No pricing, no testimonials. On mobile the privacy line sits **above the fold**. |
| `app/(app)/dashboard/page.tsx` | Sidebar, search, meeting cards with status pill, action counts, overdue count. Plus loading skeleton, empty, and no-results states. |
| `app/(app)/upload/page.tsx` | Dropzone, accepted formats and the 2h cap, title and date, part-preparation progress, Start processing. |
| `app/(app)/meetings/[id]/` | Shell with header, StatusStepper, and five tab routes: `minutes`, `transcript`, `actions`, `email`, `ask`. Two panes above 1280, stacked below. Tab row becomes a scrollable pill row below 768. |
| `app/(app)/actions/page.tsx` | Cross-meeting kanban. Filters: owner, meeting, overdue-only. Filters collapse into a Sheet below 1024. |
| `app/(app)/settings/page.tsx` | Profile · Google connection with granted scopes in plain language · Defaults · Data with a 1-30 day retention slider and delete-everything · Usage with today's minutes and remaining quota. |
| `app/share/[token]/page.tsx` | Read-only. No editing affordances, one sign-up link in the footer, `noindex, nofollow`. |

Breakpoints 640 / 768 / 1024 / 1280 / 1536, content capped at 1440. Responsive behaviour per screen is documented on Figma page `07 · Handoff`.

**Phase 3 exit:** every route renders in both modes and matches its Figma frame.

---

## Motion

From `DESIGN-SYSTEM.md` section 6, with the curves resolved. Nothing over 350ms. Nothing translates more than 16px except sheets and toasts.

| Interaction | Duration | Curve | Property |
| --- | --- | --- | --- |
| Hover, focus | 120ms | `cubic-bezier(0, 0, 0.2, 1)` | color, border-color |
| Button press | 80ms | `cubic-bezier(0.4, 0, 1, 1)` | `scale(0.98)` |
| Dialog enter | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` | opacity, translateY 4px |
| Dialog exit | 150ms | `cubic-bezier(0.4, 0, 1, 1)` | opacity, translateY 4px |
| Sheet enter / exit | 200 / 150ms | same as dialog | translateX/Y |
| Tab change | 180ms | `cubic-bezier(0.4, 0, 0.2, 1)` | opacity cross-fade, no slide |
| Stepper stage advance | 300ms | spring stiffness 400 damping 28 | check scale-in, connector scaleX |
| Toast in | 200ms | `cubic-bezier(0, 0, 0.2, 1)` | opacity, translateY 12px |
| List add / remove | 180ms | `cubic-bezier(0.4, 0, 0.2, 1)` | height, opacity |
| Processing pulse | 2000ms | ease-in-out infinite | opacity 0.5 → 1 on the active dot |
| Skeleton shimmer | 1400ms | linear infinite | background-position |
| Kanban drag | — | spring stiffness 500 damping 40 | transform |

`prefers-reduced-motion` is mandatory: the pulse becomes a static filled dot, the stepper still swaps its icon, transitions drop to 0.01ms. State is never conveyed by motion alone.

---

## Non-negotiables

- No emoji. No exclamation marks in product copy. "3 action items found", never "We found 3 exciting action items!"
- Light and dark are both first-class. Dark is not a filter.
- WCAG 2.1 AA. Text 4.5:1, large text and UI boundaries 3:1. Visible 2px focus ring at 2px offset, never removed.
- Colour never carries meaning alone. Overdue is red **and** says "Overdue". Stages carry an icon **and** a label.
- Honesty markers. AI-inferred speaker names and action items stay marked until confirmed. The email screen states plainly that SyncMind creates a draft and cannot send.
- Every list surface ships three states: loading skeleton, empty, error. A missing state is incomplete work.
- One border, at most one soft shadow. No layered shadows, no glows, no gradient meshes, no glassmorphism.
- The transcript is the most-read surface. 15px, 1.7 line-height, 68ch. Tune for sustained reading, not density.

---

## Enums — source of truth is `docs/DATA-MODEL.md`

```ts
type MeetingStatus = "draft" | "uploading" | "transcribing" | "analyzing" | "ready" | "failed" | "quota_blocked";
type ActionStatus   = "todo" | "in_progress" | "done";
type ActionPriority = "low" | "medium" | "high";
type EmailTone      = "professional" | "friendly" | "brief";
type Confidence     = "stated" | "inferred";   // on speakers AND action items
// retention_days: 1-30, default 7
```

---

## Copy — use these strings verbatim

They survived a plain-language pass and an AI-writing pass. Do not paraphrase.

- Ask, no answer: "That does not appear in this meeting's transcript."
- Audio purged: "Recording deleted after 7 days. Your notes are still here." / "You can still jump to any moment in the text, but there is no audio to play."
- Part failure: "Part 4 did not go through after three tries. Parts 1 to 3 are saved and ready to read."
- Quota reached: "You have used all 120 of your free minutes for today. Your recording is in the queue and will start again at midnight, about 4 hours from now."
- WASM fallback: "Your browser cannot prepare this file." / "Your browser cannot split this recording into pieces. Upload a file under 20 MB, or make it smaller first."
- Wrong type: "We cannot read a PDF. Try an mp3, m4a, wav, webm, ogg, mp4 or mov file."
- Over the cap: "This one is 2 hours 41 minutes. Split it into shorter pieces and upload each one."
- Email disclaimer: "SyncMind writes the draft into Gmail. It can never send it for you."
- Zero actions: "Nobody committed to anything with a name or a date attached."
- Not allowlisted: "SyncMind is still in early access and limited to 100 people. Ask for an invite and we will add you."
- Google scopes, plain: "Write email drafts for you. It can never send them." / "Add your action items to your calendar."

**Terminology:** the product noun is **minutes**, not "notes". It is the tab name and the term throughout the docs. Do not mix the two — that split was found and fixed once already.

Say "part", never "chunk". Never surface "WebAssembly", "quota_blocked", or any other internal identifier to a user.

---

## Corrections the Figma file carries that `DESIGN-SYSTEM.md` does not

1. **`DESIGN-SYSTEM.md` section 7 is wrong.** It claims the token pairs satisfy AA in both themes. Light mode does not: `warning` 2.46:1, `success` 3.61:1, `info` 4.15:1, `destructive` 4.25:1 on muted, `input` 1.23:1. Hence the five derived tokens. Bind the documented 17 for fills, borders and dots; use the derived ones for text and control borders.
2. **`input-strong` was corrected twice.** First solve cleared 3:1 against `background` only and still failed against `muted`, the surface fields actually sit on inside cards and kanban columns. Final values are the ones in the token block above.
3. **Transcript typography.** Section 3's table says mono 14/1.7; the prose says 15/1.7 at 68ch. Resolved as: utterance text Inter 15/1.7 at 68ch, timestamps JetBrains Mono 14 tabular.
4. **Inter Tight.** Not installed in the Figma environment, so headings render there in Inter. In code, load Inter Tight properly — the tracking values were written for it.

---

## Verification per phase

1. Token page renders every token in both modes, values match the table.
2. Contrast: assert every text-on-surface pair with a script, not by eye. The Figma handoff page has the expected numbers.
3. Component gallery matches Figma page `02 · Components` in both modes.
4. Each route matches its Figma frame at 1440 and 375.
5. Keyboard: tab through upload → review → export with no trap and a visible ring at every stop.
6. Kanban is fully operable without a mouse via the per-card status select.
7. Reduced motion on: no pulse, no shimmer, stepper still communicates state.
8. Grep the build for emoji and for `!` in user-facing strings. Both must be zero.

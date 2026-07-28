# SyncMind — Design System

## 1. Brand

**Name.** *Sync* — the meeting itself, people getting aligned. *Mind* — the memory that outlasts the meeting. Together: the thing that remembers so you do not have to.

**Tagline.** Meetings in. Momentum out.

**Positioning.** A calm, competent assistant. Not a hype product, not a toy. The user just finished an hour of talking; the interface should feel like relief, not another demanding surface.

**Voice.**
- Direct. "3 action items found" not "We've discovered 3 exciting action items!"
- Honest about uncertainty. "AI-inferred" badges, "That does not appear in this transcript."
- No exclamation marks in product copy. No emoji in the UI.
- Errors state what happened and what to do: "Chunk 4 failed after 3 attempts. Chunks 1-3 are saved. Retry."

**Logo.** Wordmark `SyncMind` in Inter Tight SemiBold, with the mark: two offset rounded arcs forming an implied circle that does not quite close — sync in progress, memory retained. Monochrome; it must work at 24px in a favicon and in a single ink color.

## 2. Color

The palette is a near-neutral slate base with a single deep-teal accent. Meetings are dense with text; saturated chrome would compete with content. Color carries meaning only: accent = action, semantic = state.

### Light

```css
:root {
  --background:        oklch(0.99 0.002 250);
  --foreground:        oklch(0.21 0.01 255);
  --card:              oklch(1 0 0);
  --card-foreground:   oklch(0.21 0.01 255);
  --muted:             oklch(0.965 0.004 250);
  --muted-foreground:  oklch(0.52 0.012 255);
  --border:            oklch(0.92 0.005 250);
  --input:             oklch(0.92 0.005 250);

  --primary:           oklch(0.52 0.11 195);   /* deep teal */
  --primary-foreground:oklch(0.99 0.002 250);
  --accent:            oklch(0.95 0.02 195);
  --accent-foreground: oklch(0.36 0.09 195);
  --ring:              oklch(0.52 0.11 195);

  --success:           oklch(0.60 0.13 155);
  --warning:           oklch(0.72 0.14 75);
  --destructive:       oklch(0.58 0.19 27);
  --info:              oklch(0.58 0.12 250);

  --radius: 0.625rem;
}
```

### Dark

```css
.dark {
  --background:        oklch(0.17 0.008 255);
  --foreground:        oklch(0.95 0.004 250);
  --card:              oklch(0.21 0.009 255);
  --card-foreground:   oklch(0.95 0.004 250);
  --muted:             oklch(0.25 0.009 255);
  --muted-foreground:  oklch(0.67 0.012 255);
  --border:            oklch(0.29 0.01 255);
  --input:             oklch(0.29 0.01 255);

  --primary:           oklch(0.72 0.11 195);
  --primary-foreground:oklch(0.17 0.008 255);
  --accent:            oklch(0.28 0.04 195);
  --accent-foreground: oklch(0.85 0.08 195);
  --ring:              oklch(0.72 0.11 195);

  --success:           oklch(0.70 0.13 155);
  --warning:           oklch(0.79 0.14 75);
  --destructive:       oklch(0.65 0.18 27);
  --info:              oklch(0.68 0.12 250);
}
```

Dark mode is a first-class target, not a filter. Every screen is checked in both.

### Semantic use

| Meaning | Token |
| --- | --- |
| Primary action, active nav, focus ring, progress fill | `--primary` |
| Done, success toast, completed stage | `--success` |
| Overdue, quota warning, AI-inferred badge | `--warning` |
| Failed, delete, destructive confirm | `--destructive` |
| Processing, informational banner | `--info` |
| Priority high / medium / low | `--destructive` / `--warning` / `--muted-foreground` |

Never use color alone to convey state. Overdue is red *and* carries the word "Overdue". Status stages show an icon plus a label.

## 3. Typography

| Role | Family | Notes |
| --- | --- | --- |
| Display, headings | Inter Tight | `font-optical-sizing: auto`, tight tracking at large sizes |
| Body, UI | Inter | default |
| Transcript, timestamps, code | JetBrains Mono | tabular figures for timestamps |

All three self-hosted via `next/font/google` — no runtime request to Google Fonts, keeping the page independent of a third party.

### Scale

| Token | Size / line-height | Tracking | Use |
| --- | --- | --- | --- |
| `text-display` | 3.5rem / 1.05 | -0.03em | Landing hero |
| `text-h1` | 2rem / 1.15 | -0.02em | Page title |
| `text-h2` | 1.5rem / 1.25 | -0.015em | Section |
| `text-h3` | 1.125rem / 1.35 | -0.01em | Card title |
| `text-body` | 0.9375rem / 1.6 | 0 | Default |
| `text-sm` | 0.875rem / 1.5 | 0 | Secondary |
| `text-xs` | 0.8125rem / 1.4 | 0.005em | Meta, badges |
| `text-mono` | 0.875rem / 1.7 | 0 | Transcript |

Transcript body is set at 0.9375rem with 1.7 line-height and a 68ch max measure. It is the most-read surface in the product and is tuned for sustained reading, not density.

## 4. Spacing, layout, elevation

4px base scale: `1 2 3 4 6 8 12 16 24` → 4px to 96px.

| Breakpoint | Width | Layout |
| --- | --- | --- |
| `sm` | ≥640px | Single column, bottom tab bar |
| `md` | ≥768px | Single column, collapsible sidebar |
| `lg` | ≥1024px | Persistent sidebar + content |
| `xl` | ≥1280px | Meeting detail becomes two panes |
| `2xl` | ≥1536px | Content capped at 1440px, centered |

Radii: `sm` 6px (badges, inputs) · `md` 10px (buttons, cards) · `lg` 14px (modals, panels) · `full` (avatars, pills).

Elevation is restrained — one border and at most one soft shadow. No layered drop shadows, no glow.

```css
--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
--shadow-md: 0 4px 12px oklch(0 0 0 / 0.07);
--shadow-lg: 0 12px 32px oklch(0 0 0 / 0.10);
```

In dark mode, shadows are replaced by a lighter border — shadows do not read on dark surfaces.

## 5. Components

Built on shadcn/ui. Primitives used as-is: Button, Input, Textarea, Select, Dialog, Sheet, DropdownMenu, Tabs, Badge, Card, Toast (sonner), Tooltip, Skeleton, Progress, Avatar, Separator, Command, AlertDialog.

### Product components

| Component | Behavior |
| --- | --- |
| `Dropzone` | Full-area drag target, file-type validation, duration probe before accepting, per-chunk progress rows |
| `StatusStepper` | Horizontal on desktop, vertical on mobile. Four stages, each pending / active (pulsing dot) / done (check) / failed (cross). Active stage shows `stage_detail`. |
| `AudioPlayer` | Sticky at the bottom of the transcript pane. Play/pause, ±15s, speed 1x/1.25x/1.5x/2x, seekable waveform-free scrubber, keyboard `space`/`←`/`→` |
| `TranscriptList` | Virtualized past 200 rows. Each row: monospace timestamp button, speaker chip, text. The row matching current playback is highlighted with a left accent bar. Search highlights matches and provides next/prev jump. |
| `SpeakerChip` | Colored initial + label. Click opens rename, which applies across the meeting. Carries an "inferred" dot when AI-derived and unconfirmed. |
| `MinutesEditor` | Section blocks (Overview / Topics / Decisions / Open Questions). Click to edit in place, save on blur, subtle "Edited" marker once touched. Each item shows its timestamp, which seeks the player. |
| `ActionTable` | Inline-editable columns: title, owner, due, priority, status. Row menu: add to calendar, delete. Overdue rows show a red left border and an "Overdue" pill. |
| `KanbanBoard` | Three columns with drag-and-drop (dnd-kit). Cards show title, meeting name, owner, due. Filters: owner, meeting, overdue-only. |
| `EmailComposer` | Tone segmented control, editable subject, markdown body editor with live preview, recipient chips. Primary button: "Create Gmail draft". Copy explicitly states SyncMind will not send. |
| `AskPanel` | Question input, answer card, citation chips that seek the player. Prior questions listed below, collapsible. |
| `QuotaBanner` | Appears only when `quota_blocked` or above 80% of a daily ceiling. States the limit and the reset time. |
| `EmptyState` | Illustration-free: a short heading, one sentence, one action. Used on dashboard, board, and search-with-no-results. |

## 6. Motion

Motion communicates state change. It never decorates.

| Interaction | Spec |
| --- | --- |
| Hover, focus | 120ms `ease-out`, color/border only |
| Button press | `scale(0.98)`, 80ms |
| Dialog, sheet | 200ms enter `cubic-bezier(0.32, 0.72, 0, 1)`, 150ms exit; sheet slides, dialog fades + 4px rise |
| Tab change | 180ms cross-fade, no horizontal slide |
| Stage advance in stepper | 300ms: check icon springs in, connector fills left-to-right |
| Toast | slide up 12px + fade, 200ms |
| List item add / remove | 180ms height + opacity |
| Processing pulse | 2s `ease-in-out` infinite opacity 0.5 → 1 on the active stage dot |
| Skeleton shimmer | 1.4s linear sweep |

Nothing animates longer than 350ms. Nothing animates position by more than 16px except sheets and toasts.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Under reduced motion the processing pulse becomes a static filled dot and the stepper still updates its icon — state is never conveyed by motion alone.

## 7. Accessibility

Target: WCAG 2.1 AA.

- All text ≥ 4.5:1 against its background; large text and UI borders ≥ 3:1. The token pairs above are chosen to satisfy this in both themes.
- Visible focus ring on every interactive element: 2px `--ring` with a 2px offset. Never removed.
- Full keyboard path through upload → review → export. Transcript timestamps are `<button>` elements, not clickable divs.
- Processing status uses `aria-live="polite"`; failures use `aria-live="assertive"`.
- The audio player exposes native-equivalent controls with labels; playback rate and position are announced on change.
- Drag-and-drop on the kanban has a keyboard alternative (a status `<select>` on every card) — drag is never the only path.
- Form errors are tied to inputs with `aria-describedby`, and the error text says what to do.
- Minimum touch target 44×44px on mobile.
- Every icon-only button has an accessible name.

## 8. Screens

### Landing (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│  SyncMind                                    [Sign in]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│         Meetings in. Momentum out.                           │
│         Upload a recording. Get minutes, action items,       │
│         a follow-up email, and calendar entries.             │
│                                                              │
│         [ Continue with Google ]     Free. No card.          │
│                                                              │
│   ┌──────────────────────────────────────────────────┐       │
│   │  animated product still: minutes + action list   │       │
│   └──────────────────────────────────────────────────┘       │
│                                                              │
│   Upload ──▶ Transcribe ──▶ Minutes ──▶ Follow up            │
│                                                              │
│   [Accurate transcript] [Real action items] [One-click send] │
│                                                              │
│   Your recordings are private, deletable, and removed        │
│   automatically after 7 days.                                │
└──────────────────────────────────────────────────────────────┘
```

One page, one call to action, no pricing table, no testimonials. The privacy line sits above the fold on mobile because it is the most common objection.

### Dashboard (`/dashboard`)

```
┌────────────┬─────────────────────────────────────────────────┐
│ SyncMind   │  Meetings                    [ + New meeting ]  │
│            │  ┌────────────────────────────────────────────┐ │
│ ▸ Meetings │  │ [search all meetings]                      │ │
│   Actions  │  └────────────────────────────────────────────┘ │
│   Settings │                                                 │
│            │  ┌────────────────────────────────────────────┐ │
│            │  │ Q3 Planning            Ready               │ │
│            │  │ Jul 24 · 52 min · 7 actions · 2 overdue    │ │
│            │  ├────────────────────────────────────────────┤ │
│            │  │ Client — Northwind     Transcribing 3/5 ●  │ │
│            │  │ Jul 24 · 31 min                            │ │
│            │  ├────────────────────────────────────────────┤ │
│            │  │ 1:1 with Dan           Ready               │ │
│            │  │ Jul 22 · 24 min · 3 actions                │ │
│            │  └────────────────────────────────────────────┘ │
│ [avatar]   │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

Empty state: "No meetings yet. Upload a recording to get your first set of minutes." with the upload button.

### Upload (`/upload`)

```
┌──────────────────────────────────────────────────────────────┐
│  New meeting                                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │            Drop a recording here                       │  │
│  │            or click to choose a file                   │  │
│  │                                                        │  │
│  │      mp3 · m4a · wav · webm · mp4 · mov   up to 2h     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Title  [ Q3 Planning                                     ]  │
│  Date   [ 2026-07-24 ]                                       │
│                                                              │
│  Preparing audio                                             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  chunk 4 of 6                      │
│                                                              │
│                                    [ Start processing ]      │
└──────────────────────────────────────────────────────────────┘
```

### Meeting detail (`/meetings/[id]`)

```
┌──────────────────────────────────────────────────────────────┐
│ ← Q3 Planning                    Jul 24 · 52 min   [Share ▾] │
│ ● Uploaded ─── ● Transcribed ─── ◐ Analyzing ─── ○ Ready     │
├──────────────────────────────────────────────────────────────┤
│ [Minutes] Transcript  Actions  Email  Ask                    │
├───────────────────────────────┬──────────────────────────────┤
│ Overview                      │  Action items          7     │
│ The team reviewed Q3 targets  │  ┌────────────────────────┐  │
│ and agreed to move the vendor │  │ Send pricing deck      │  │
│ contract forward...           │  │ Dan · Jul 26 · High    │  │
│                               │  ├────────────────────────┤  │
│ Decisions                     │  │ Sign vendor contract   │  │
│ • Move contract to legal by   │  │ Maya · Jul 31 · High   │  │
│   Friday              [12:04] │  └────────────────────────┘  │
│ • Delay the pricing change    │                              │
│   to Q4               [28:41] │  [ Add all to calendar ]     │
│                               │                              │
│ Open questions                │  Follow-up email             │
│ • Who owns vendor renewal?    │  Drafted · professional      │
│                       [34:12] │  [ Review and send ]         │
└───────────────────────────────┴──────────────────────────────┘
```

Below `xl` the right rail moves under the main content. Below `md` the tab row becomes a scrollable pill row.

### Transcript tab

```
┌──────────────────────────────────────────────────────────────┐
│ [search in transcript          ]  3 of 11   ↑ ↓   Speakers ▾ │
├──────────────────────────────────────────────────────────────┤
│ 00:04:12  (M) Maya   We need the vendor contract signed      │
│                      before the quarter closes.              │
│▌00:04:19  (D) Dan    I'll get it to legal by Friday.         │
│ 00:04:26  (M) Maya   Good. Can you copy me on that thread?   │
├──────────────────────────────────────────────────────────────┤
│ ▶  ──────●───────────────────  04:19 / 52:07   1.25x  ⟲15 ⟳15│
└──────────────────────────────────────────────────────────────┘
```

### Action items board (`/actions`)

```
┌──────────────────────────────────────────────────────────────┐
│ Action items      Owner ▾  Meeting ▾  [ ] Overdue only       │
├───────────────┬───────────────┬──────────────────────────────┤
│ To do      5  │ In progress 2 │ Done                    12   │
│ ┌───────────┐ │ ┌───────────┐ │ ┌──────────────────────────┐ │
│ │Send deck  │ │ │Draft SOW  │ │ │Book venue                │ │
│ │Dan Jul 26 │ │ │Maya Jul 29│ │ │Maya · done               │ │
│ │Q3 Planning│ │ │Northwind  │ │ └──────────────────────────┘ │
│ └───────────┘ │ └───────────┘ │                              │
│ ┌───────────┐ │               │                              │
│ │Sign vendor│ │               │                              │
│ │Overdue    │ │               │                              │
│ └───────────┘ │               │                              │
└───────────────┴───────────────┴──────────────────────────────┘
```

### Settings (`/settings`)

Sections: Profile (name, email, avatar) · Google connection (connected account, granted scopes, Connect/Disconnect) · Defaults (email tone) · Data (retention days slider 1-30, "Delete all my data") · Usage (today's transcription minutes and remaining quota).

### Share page (`/share/[token]`)

Read-only. Header shows meeting title, date, and "Shared from SyncMind". Minutes and action items always; transcript only if the link was created with it enabled. No editing affordances, no navigation into the app beyond a single sign-up link in the footer. `noindex, nofollow`.

## 9. Implementation notes

- Tailwind CSS v4 with the tokens above declared in `app/globals.css` under `@theme`.
- `next-themes` for light/dark/system, with no flash on first paint.
- Icons: `lucide-react` only, 20px default stroke 1.75.
- Toasts: `sonner`, top-right on desktop, top-center on mobile.
- Every list surface ships three states: loading skeleton, empty, error. Missing states are treated as incomplete work, not polish.

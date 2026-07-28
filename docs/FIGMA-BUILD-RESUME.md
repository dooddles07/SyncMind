# SyncMind Figma Build — Resume State

Run ID: `syncmind-figma-001`
Target file: `https://www.figma.com/design/hgVbn1fdh7xkw9gkg64HF2/SyndMind`
fileKey: `hgVbn1fdh7xkw9gkg64HF2`
Approved plan: `C:\Users\Dooddles07\.claude\plans\syncmind-figma-streamed-adleman.md`
Last updated: 2026-07-28

Nothing else in this repo has been modified. This file exists only so a fresh session can resume without re-deriving state.

---

## Continuation prompt

Paste this into a new session:

> Resume the SyncMind Figma build. Run ID `syncmind-figma-001`. Read `docs/FIGMA-BUILD-RESUME.md` first, then `docs/DESIGN-SYSTEM.md`. Load skills `figma-use` and `figma-generate-library` before any `use_figma` call. Continue from Phase 4 (Components) against fileKey `hgVbn1fdh7xkw9gkg64HF2`. Do not rebuild anything listed as done.

---

## Node and ID ledger

### Pages
| Page | ID |
| --- | --- |
| `00 · Cover` | `0:1` |
| `01 · Foundations` | `4:2` |
| `02 · Components` | `4:3` |
| `03 · Screens · Desktop` | `4:4` |
| `04 · Screens · Mobile` | `4:5` |
| `05 · States & Edge` | `4:6` |
| `06 · Prototype` | `4:7` |
| `07 · Handoff` | `4:8` |

### Variable collections
| Collection | ID | Modes |
| --- | --- | --- |
| `color` | `VariableCollectionId:5:2` | Light `5:0`, Dark `5:1` |
| `spacing` | `VariableCollectionId:5:25` | Value |
| `radius` | `VariableCollectionId:5:35` | Value |

### Built nodes
| Node | ID |
| --- | --- |
| Foundations root frame | `7:2` |
| Swatch panel · Light | `7:9` |
| Swatch panel · Dark | `7:121` |
| Logo section | `10:2` |
| Iconography section | `10:22` |
| `Button` component set | `11:72` |
| `StatusStepper` component set | `13:184` |

### Icon components (page `4:3` is Components; these live on `4:2`)
`upload 10:30` · `play 10:35` · `pause 10:41` · `search 10:47` · `check 10:52` · `x 10:58` · `alert-triangle 10:65` · `clock 10:71` · `calendar 10:79` · `mail 10:85` · `chevron-down 10:90` · `more-horizontal 10:97` · `plus 10:103` · `trash-2 10:110` · `link 10:116` · `rotate-ccw 10:122` · `settings 10:135` · `message-square 10:140` · `list-checks 10:149` · `download 10:156`

Instance these with `INSTANCE_SWAP`. Do not redraw icons.

---

## Done

- **Phase 0** — 8 skills loaded. `create_design_system_rules` BLOCKED (needs Figma desktop app + Dev Mode MCP Server; this session had remote MCP only). No rules file was fabricated.
- **Phase 1** — 20 distinct 21st.dev components sourced (table below). 2 paid `get_component` retrievals deliberately unspent.
- **Phase 2** — all 8 pages created, correct order, default page renamed rather than orphaned.
- **Phase 3 — Foundations, complete:**
  - `color`: 22 variables × Light/Dark. 17 from DESIGN-SYSTEM §2 verbatim + 5 derived (see below). Scoped, `var(--token)` web code syntax set.
  - `spacing`: 9 vars, Tailwind step names (`spacing/1`=4 … `spacing/24`=96).
  - `radius`: `sm` 6, `md` 10, `lg` 14, `full` 9999.
  - 9 text styles: display, h1, h2, h3, body, sm, xs, mono, transcript.
  - 3 effect styles: shadow-sm/md/lg (light mode only by intent).
  - Logo: mark (two offset arcs), wordmark lockup, 24px proof, 32px favicon proof reversed on primary.
  - 20 Lucide icon components, 20px, stroke 1.75.
- **Phase 4 — Components, PARTIAL:** `Button` (5 variants × 6 states = 30), `StatusStepper` (6 pipeline states). Both fully variable-bound, both visually verified.

---

## Remaining

Nothing. The build is complete as of 2026-07-28.

Final counts, verified via the plugin API (the desktop MCP's `get_metadata` under-reports — it lists only the active page):

| Page | Contents |
| --- | --- |
| `00 · Cover` | 1 frame |
| `01 · Foundations` | 1 frame: tokens, type, spacing, radius, elevation, logo, 20 icon components |
| `02 · Components` | **34** component sets and standalone components |
| `03 · Screens · Desktop` | 11 frames at 1440, all 5 meeting tabs |
| `04 · Screens · Mobile` | 11 frames at 375, all 5 meeting tabs |
| `05 · States & Edge` | 2 panels, 16 states each, Light and Dark |
| `06 · Prototype` | 20 frames, **56 wired reactions**, all 6 flows |
| `07 · Handoff` | 1 frame: token map, contrast table, motion spec, a11y, code mapping, provenance, deviations |

Copy passed twice: a plain-language rewrite (115 strings, removing "chunk", "WebAssembly", OAuth scope names and similar developer jargon) and an `avoid-ai-writing` pass that cut "Real action items", an em-dash splice and a padded sentence. Verified zero exclamation marks and zero emoji across all UI copy.

---

## Decisions already locked — do not relitigate

1. **Five derived colour tokens.** DESIGN-SYSTEM §7 claims AA compliance in both themes; light mode does not comply. Verified failures: `warning` 2.46:1, `success` 3.61:1, `info` 4.15:1, `destructive` 4.25:1 on muted, `input` 1.23:1. The 17 documented tokens are bound verbatim and used for fills/borders/dots. Five derived tokens exist for text and control borders only:

   | Token | Light | Dark | Light contrast (bg/card/muted) |
   | --- | --- | --- | --- |
   | `success-text` | `#007f47` | = `success` | 4.92 / 5.06 / 4.58 |
   | `warning-text` | `#9e6100` | = `warning` | 4.91 / 5.05 / 4.57 |
   | `destructive-text` | `#ce3631` | = `destructive` | 4.87 / 5.01 / 4.53 |
   | `info-text` | `#2f72b1` | = `info` | 4.90 / 5.05 / 4.56 |
   | `input-strong` | `#8a8c8f` | `#686c72` | 3.04 worst surface (muted) |

   `input-strong` was corrected on 2026-07-28. It was originally solved against `background` only (3.02) and failed 3:1 against `muted` (2.81 light / 2.84 dark) — the surface inputs actually sit on inside cards and kanban columns. Now solved against the worst surface in each mode.

2. **Transcript typography split.** Utterance text = Inter 15/1.7, 68ch max measure (`transcript` style). Timestamps and speaker labels = JetBrains Mono 14/1.7 tabular (`mono` style).

3. **Inter Tight unavailable in Figma.** Headings use Inter with the doc's specified negative tracking. Shipped code can still load Inter Tight via `next/font/google`. Record in handoff.

4. **Side-stripe left accent bars are kept.** The `impeccable` skill bans them absolutely; the brief mandates them twice (overdue rows, currently-playing transcript row). Brief wins — here the bar is functional and always paired with text.

5. **Light/dark strategy.** Build once, duplicate the frame, call `setExplicitVariableModeForCollection` on the duplicate. Do not maintain two divergent copies.

---

## Resolved token values

| Token | Light | Dark |
| --- | --- | --- |
| background | `#fbfcfd` | `#0d1013` |
| foreground | `#15191d` | `#eceff1` |
| card | `#ffffff` | `#16191c` |
| card-foreground | `#15191d` | `#eceff1` |
| muted | `#f1f4f6` | `#1f2226` |
| muted-foreground | `#646970` | `#90969d` |
| border | `#e2e5e8` | `#282c30` |
| input | `#e2e5e8` | `#282c30` |
| primary | `#007c7c` | `#36baba` |
| primary-foreground | `#fbfcfd` | `#0d1013` |
| accent | `#e0f3f3` | `#0b2f2f` |
| accent-foreground | `#004b4c` | `#8ddfde` |
| ring | `#007c7c` | `#36baba` |
| success | `#2c965d` | `#51b67a` |
| warning | `#d79628` | `#efac44` |
| destructive | `#d33b36` | `#e8594f` |
| info | `#3c7ebe` | `#5b9ddf` |

Verified: rendered Figma hex matches these exactly. Do not recompute.

---

## Plugin API gotchas hit in this build

Read these before writing scripts. Each cost a failed call or a broken render.

1. **`resize()` resets both sizing modes to FIXED.** Set `layoutSizingHorizontal` / `layoutSizingVertical` *after* every `resize()`. This caused the Foundations root to render 100px tall and every StatusStepper variant to overlap.
2. **Hugging parent + `FILL` child is circular** and collapses text to zero width. If children are `FILL`, the parent needs a fixed width.
3. **`use_figma` calls must be sequential.** `figma-generate-library` rule 13 overrides `figma-use`'s parallel fan-out advice for design-system work.
4. **Failed scripts are atomic** — nothing is created. Safe to fix and retry, no cleanup needed.
5. **Font style strings differ per family.** Inter uses `Semi Bold` / `Extra Bold` (spaced); JetBrains Mono uses `ExtraBold` (unspaced). Verify with `listAvailableFontsAsync()`.
6. **`combineAsVariants` stacks all variants at (0,0).** Position them manually afterward.
7. **`setBoundVariableForPaint` returns a new paint** — capture and reassign, never mutate in place.
8. Do OKLCH→sRGB conversion *inside* the plugin script from the doc's source values. Removes transcription risk entirely.

---

## 21st.dev provenance

For the handoff page. 20 sourced; 3 analysed visually.

| 21st.dev component | id | Author | Informs |
| --- | --- | --- | --- |
| Table Edit *(visual)* | 7457 | ruixen.ui | `ActionTable` — constant row height between read and edit mode, per-cell inline inputs, Save replaces row menu |
| File Upload with Preview *(visual)* | 18108 | ephraimduncan | `Dropzone` — dashed target, circular icon badge, two-line copy with muted constraint, separate footer action band |
| Audio Timeline With Chapters *(visual)* | 7986 | ruixen.ui | `AudioPlayer` — reference too thin to use; building from DESIGN-SYSTEM §5 instead |
| Synced Lyric Captions | 21980 | moumensoliman | `TranscriptList` playback highlight |
| Timeline | 8175 | nparashar150 | `AudioPlayer` scrubber |
| HeroSection Enterprise-Ready | 8156 | uniquesonu | Landing hero |
| Hero AI Value Proposition | 19048 | uilayout.contact | Landing product still |
| Modern sideBar | 2741 | uniquesonu | Authed layout sidebar |
| Dashboard Sidebar | 14941 | arunjdass | Authed shell, dual-theme |
| UploadThing Dropzone | 18847 | elements- | `Dropzone`, `ChunkProgress` |
| Onboarding Stepper Progress | 19143 | shadcnspace | `StatusStepper` |
| Kanban | 4224 | sean0205 | `KanbanBoard` |
| Kanban Board Skeleton | 19037 | cnippet.dev | Kanban loading skeleton |
| Suggestions | 12342 | serafimcloud | `AskPanel` citation chips |
| AI Suggestions | 20132 | pacekit | `AskPanel` chip row |
| Empty State with Marquee | 19377 | shadcnui-blocks | `EmptyState` |
| Empty Background | 18266 | uiable | `EmptyState` |
| Toggle Group | 18831 | cnippet.dev | `EmailComposer` tone segmented control |
| Alert | 332 | serafimcloud | `QuotaBanner` |
| Auth Form | 19152 | deltacomponents | "Continue with Google" button |
| Excel-Style Table | 8778 | ravikatiyar162 | `ActionTable` cell editing |

Google mark: svgl `google.svg` is an 8KB gradient variant, too heavy for a 20px slot. Use the canonical flat 4-path Google mark from Google's sign-in branding spec. Do not hand-draw.

---

## Enum values — source of truth is `docs/DATA-MODEL.md`

- `meeting_status`: draft · uploading · transcribing · analyzing · ready · failed · quota_blocked
- `action_status`: todo · in_progress · done
- `action_priority`: low · medium · high
- `email_tone`: professional · friendly · brief
- `retention_days`: 1–30, default 7
- Action items and speaker names both carry a `stated` / `inferred` confidence marker (`AI-PIPELINE.md`:129-131)

Exact copy strings to reuse:
- Ask, no answer: "That does not appear in this meeting's transcript."
- Audio purged: "Audio removed after 7 days. Transcript retained."
- Chunk failure: "Chunk 4 failed after 3 attempts. Chunks 1-3 are saved. Retry."

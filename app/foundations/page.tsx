import { ThemeToggle } from "@/components/theme-toggle";

// Phase 1 exit criterion: every token rendered in both modes.
// Values must match docs/UI-BUILD-PLAN.md. Delete this route once Phase 3 lands.

const SURFACES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "input-strong",
] as const;

const BRAND = ["primary", "primary-foreground", "accent", "accent-foreground", "ring"] as const;

const SEMANTIC = ["success", "warning", "destructive", "info"] as const;

const DERIVED = ["success-text", "warning-text", "destructive-text", "info-text"] as const;

const TYPE = [
  { name: "display", cls: "font-display text-[56px] leading-[1.05] tracking-[-0.03em]", sample: "Meetings in. Momentum out." },
  { name: "h1", cls: "font-display text-[32px] leading-[1.15] tracking-[-0.02em]", sample: "Q3 Planning" },
  { name: "h2", cls: "font-display text-[24px] leading-[1.25] tracking-[-0.015em]", sample: "Action items" },
  { name: "h3", cls: "font-display text-[18px] leading-[1.35] tracking-[-0.01em]", sample: "Send pricing deck" },
  { name: "body", cls: "text-[15px] leading-[1.6]", sample: "The team reviewed Q3 targets and agreed to move the vendor contract forward." },
  { name: "sm", cls: "text-[14px] leading-[1.5]", sample: "Jul 24 · 52 min · 7 actions" },
  { name: "xs", cls: "text-[13px] leading-[1.4] tracking-[0.005em]", sample: "Overdue" },
  { name: "mono", cls: "font-mono text-[14px] leading-[1.7] tabular", sample: "00:04:19" },
  { name: "transcript", cls: "text-[15px] leading-[1.7] measure-transcript", sample: "I'll get it to legal by Friday. Can you copy me on that thread?" },
];

const SPACING = [
  ["1", 4], ["2", 8], ["3", 12], ["4", 16], ["6", 24],
  ["8", 32], ["12", 48], ["16", 64], ["24", 96],
] as const;

const RADIUS = [
  ["sm", "6px", "badges, inputs"],
  ["md", "10px", "buttons, cards"],
  ["lg", "14px", "modals, panels"],
  ["full", "9999px", "avatars, pills"],
] as const;

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] border border-border"
        style={{ background: `var(--${token})` }}
      />
      <div className="min-w-0">
        <p className="text-[14px] leading-[1.5]">{token}</p>
        <p className="font-mono text-[13px] leading-[1.4] text-muted-foreground">
          var(--{token})
        </p>
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-[1.25] tracking-[-0.015em]">{title}</h2>
        {note ? <p className="text-[14px] leading-[1.5] text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function FoundationsPage() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-16 px-8 py-16">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[32px] leading-[1.15] tracking-[-0.02em]">Foundations</h1>
          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-muted-foreground">
            Every token from docs/DESIGN-SYSTEM.md section 2. Toggle the theme to confirm
            each one re-themes. Values must match docs/UI-BUILD-PLAN.md.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Surfaces and text">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {SURFACES.map((t) => <Swatch key={t} token={t} />)}
        </div>
      </Section>

      <Section title="Brand">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {BRAND.map((t) => <Swatch key={t} token={t} />)}
        </div>
      </Section>

      <Section
        title="Semantic"
        note="Fills, borders and dots only. These fail WCAG AA as text in light mode."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SEMANTIC.map((t) => <Swatch key={t} token={t} />)}
        </div>
      </Section>

      <Section
        title="Derived"
        note="Text and control borders only. Solved to clear 4.5:1 on the worst surface, which is muted."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {DERIVED.map((t) => <Swatch key={t} token={t} />)}
        </div>
        <div className="flex flex-wrap gap-3 rounded-[var(--radius-md)] bg-muted p-4">
          <span className="text-[14px] text-success-text">Ready</span>
          <span className="text-[14px] text-warning-text">Overdue</span>
          <span className="text-[14px] text-destructive-text">Failed</span>
          <span className="text-[14px] text-info-text">Transcribing</span>
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-6 rounded-[var(--radius-lg)] border border-border bg-card p-6">
          {TYPE.map((t) => (
            <div key={t.name} className="flex flex-col gap-1">
              <p className="font-mono text-[13px] leading-[1.4] text-primary">{t.name}</p>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" note="4px base scale.">
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-6">
          {SPACING.map(([step, px]) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-24 font-mono text-[13px] text-muted-foreground">
                spacing/{step}
              </span>
              <span className="h-4 rounded-[var(--radius-sm)] bg-primary" style={{ width: px }} />
              <span className="text-[13px] text-muted-foreground">{px}px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-12">
          {RADIUS.map(([name, px, use]) => (
            <div key={name} className="flex w-[140px] flex-col items-center gap-2">
              <div
                className="h-[88px] w-[88px] border border-primary bg-accent"
                style={{ borderRadius: px }}
              />
              <p className="text-center text-[13px]">radius/{name} · {px}</p>
              <p className="text-center text-[13px] text-muted-foreground">{use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Elevation"
        note="Light mode only. In dark the shadow is dropped and the border carries the separation instead."
      >
        <div className="flex flex-wrap gap-8">
          {(["sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="flex flex-col gap-2">
              <div
                className="h-24 w-56 rounded-[var(--radius-md)] border border-border bg-card"
                style={{ boxShadow: `var(--shadow-${s})` }}
              />
              <p className="text-[13px]">shadow-{s}</p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

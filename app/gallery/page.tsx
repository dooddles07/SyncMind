import { Upload } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton, MeetingCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusStepper } from "@/components/meeting/status-stepper";
import type { MeetingStatus } from "@/lib/types";

// Phase 2 exit criterion: every component in every state, both modes.
// Check against Figma page "02 · Components".

const VARIANTS = ["primary", "secondary", "ghost", "destructive", "outline"] as const;
const SIZES = ["sm", "md", "lg"] as const;

const PIPELINE: { status: MeetingStatus; detail: string | null }[] = [
  { status: "uploading", detail: "Uploading part 2 of 6" },
  { status: "transcribing", detail: "Writing up part 3 of 5" },
  { status: "analyzing", detail: "Finding the decisions and action items" },
  { status: "ready", detail: null },
  {
    status: "failed",
    detail: "Part 4 did not go through after three tries. Parts 1 to 3 are saved and ready to read.",
  },
  {
    status: "quota_blocked",
    detail:
      "You have used all 120 of your free minutes for today. Your recording is in the queue and will start again at midnight, about 4 hours from now.",
  },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-[1.25] tracking-[-0.015em]">
          {title}
        </h2>
        {note ? (
          <p className="max-w-[68ch] text-[14px] leading-[1.5] text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="w-28 shrink-0 font-mono text-[13px] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-16 px-8 py-16">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[32px] leading-[1.15] tracking-[-0.02em]">
            Components
          </h1>
          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-muted-foreground">
            Every component in every state. Toggle the theme and confirm each one
            re-themes without losing meaning.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section
        title="Button"
        note="Focus ring is applied globally in globals.css, so tab to any control to see it. Press state is an 80ms scale."
      >
        <div className="flex flex-col gap-4">
          {VARIANTS.map((v) => (
            <Row key={v} label={v}>
              <Button variant={v}>Start processing</Button>
              <Button variant={v} disabled>
                Disabled
              </Button>
              <Button variant={v} loading loadingLabel="Working">
                Working
              </Button>
              <Button variant={v}>
                <Upload aria-hidden />
                With icon
              </Button>
            </Row>
          ))}
          {SIZES.map((s) => (
            <Row key={s} label={`size ${s}`}>
              <Button size={s}>Upload</Button>
              <Button size={s} variant="outline">
                <Upload aria-hidden />
                Upload
              </Button>
            </Row>
          ))}
        </div>
      </Section>

      <Section
        title="Badge"
        note="Every badge carries a word. Text uses the derived tokens so light mode clears 4.5:1."
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Draft</Badge>
          <Badge variant="success" dot>
            Ready
          </Badge>
          <Badge variant="info" dot>
            Transcribing
          </Badge>
          <Badge variant="warning" dot>
            Overdue
          </Badge>
          <Badge variant="destructive" dot>
            Failed
          </Badge>
          <Badge variant="outline">AI-inferred</Badge>
        </div>
      </Section>

      <Section title="Card">
        <div className="flex flex-wrap gap-4">
          <Card className="w-[280px]">
            <CardHeader>
              <CardTitle>Q3 Planning</CardTitle>
              <CardDescription>Jul 24 · 52 min · 7 actions</CardDescription>
            </CardHeader>
          </Card>
          <Card interactive className="w-[280px]">
            <CardHeader>
              <CardTitle>Interactive</CardTitle>
              <CardDescription>Hover to see the border change</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section
        title="StatusStepper"
        note="One variant per meetings.status. Every stage carries an icon and a status word, so nothing depends on colour. Horizontal above md, vertical below."
      >
        <div className="flex flex-col gap-8">
          {PIPELINE.map(({ status, detail }) => (
            <div key={status} className="flex flex-col gap-2">
              <span className="font-mono text-[13px] text-primary">{status}</span>
              <div className="rounded-[var(--radius-md)] border border-border bg-card p-4">
                <StatusStepper status={status} stageDetail={detail} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Skeleton"
        note="Every list surface ships loading, empty and error. This is the loading half."
      >
        <div className="flex flex-col gap-3">
          <MeetingCardSkeleton />
          <MeetingCardSkeleton />
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </Section>

      <Section title="EmptyState">
        <div className="rounded-[var(--radius-md)] border border-border bg-card">
          <EmptyState
            heading="No meetings yet"
            body="Upload a recording and get your first set of minutes."
            actionLabel="Upload a recording"
          />
        </div>
      </Section>
    </main>
  );
}

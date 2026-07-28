import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingStatus } from "@/lib/types";

/*
  One variant per meetings.status in docs/ARCHITECTURE.md section 3.2.

  Every stage carries an icon AND a status word, so the state survives
  greyscale, colour blindness, and reduced motion. The active dot pulses,
  but the pulse is decoration: removing it loses nothing.

  Horizontal on desktop, vertical below md.
*/

const STAGES = ["Uploaded", "Transcribed", "Analyzed", "Ready"] as const;

type StageState = "done" | "active" | "pending" | "failed" | "blocked";

const STATUS_WORD: Record<StageState, string> = {
  done: "Done",
  active: "In progress",
  pending: "Pending",
  failed: "Failed",
  blocked: "Waiting",
};

/** Which stage index each pipeline status is sitting on, and how that stage reads. */
function resolveStages(status: MeetingStatus): StageState[] {
  const at = (i: number, s: StageState): StageState[] =>
    STAGES.map((_, idx) => (idx < i ? "done" : idx === i ? s : "pending"));

  switch (status) {
    case "draft":
    case "uploading":
      return at(0, "active");
    case "transcribing":
      return at(1, "active");
    case "analyzing":
      return at(2, "active");
    case "ready":
      return STAGES.map(() => "done");
    case "failed":
      return at(1, "failed");
    case "quota_blocked":
      return at(1, "blocked");
  }
}

function Marker({ state }: { state: StageState }) {
  const base =
    "flex size-6 shrink-0 items-center justify-center rounded-full";
  if (state === "done")
    return (
      <span className={cn(base, "bg-success")}>
        <Check size={14} strokeWidth={3} className="text-primary-foreground" aria-hidden />
      </span>
    );
  if (state === "failed")
    return (
      <span className={cn(base, "bg-destructive")}>
        <X size={12} strokeWidth={3} className="text-primary-foreground" aria-hidden />
      </span>
    );
  if (state === "blocked")
    return (
      <span className={cn(base, "bg-warning")}>
        <Clock size={14} strokeWidth={2.5} className="text-foreground" aria-hidden />
      </span>
    );
  if (state === "active")
    return (
      <span className={cn(base, "border-2 border-primary bg-accent")}>
        {/* 2s ease-in-out pulse; frozen to a static filled dot under reduced motion */}
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
      </span>
    );
  return <span className={cn(base, "border border-border bg-muted")} />;
}

const LABEL_TONE: Record<StageState, string> = {
  done: "text-foreground",
  active: "text-foreground",
  pending: "text-muted-foreground",
  failed: "text-destructive-text",
  blocked: "text-warning-text",
};

export function StatusStepper({
  status,
  stageDetail,
  className,
}: {
  status: MeetingStatus;
  /** meetings.stage_detail, rendered verbatim. Never re-word client-side. */
  stageDetail?: string | null;
  className?: string;
}) {
  const states = resolveStages(status);
  const isTerminal = status === "ready" || status === "failed";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol
        className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3"
        // progress is announced politely; failures are escalated below
        aria-live={status === "failed" ? "assertive" : "polite"}
      >
        {STAGES.map((stage, i) => {
          const state = states[i];
          return (
            <li
              key={stage}
              className="flex items-center gap-2 md:flex-1 md:last:flex-none"
            >
              <div className="flex items-center gap-2">
                <Marker state={state} />
                <div className="flex flex-col gap-0.5 md:gap-1">
                  <span
                    className={cn(
                      "text-[14px] leading-[1.5]",
                      state === "pending" ? "font-normal" : "font-medium",
                      LABEL_TONE[state],
                    )}
                  >
                    {stage}
                  </span>
                  <span className="text-[13px] leading-[1.4] text-muted-foreground">
                    {STATUS_WORD[state]}
                  </span>
                </div>
              </div>
              {i < STAGES.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-0.5 flex-1 md:block",
                    state === "done" ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {stageDetail && !isTerminal ? (
        <p className="text-[14px] leading-[1.5] text-muted-foreground">{stageDetail}</p>
      ) : null}

      {stageDetail && status === "failed" ? (
        <p className="text-[14px] leading-[1.5] text-destructive-text">{stageDetail}</p>
      ) : null}
    </div>
  );
}

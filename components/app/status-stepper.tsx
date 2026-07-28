"use client";

import { AlertTriangle, Check, Clock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { MeetingStatus } from "@/lib/types";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const stages = [
  { key: "uploading", label: "Uploaded" },
  { key: "transcribing", label: "Written down" },
  { key: "analyzing", label: "Picked apart" },
  { key: "ready", label: "Ready" },
] as const;

const order: Record<string, number> = { uploading: 0, transcribing: 1, analyzing: 2, ready: 3 };

/**
 * Stage is never carried by motion or colour alone. Each step shows an icon and a word,
 * so it still reads with animations off and for anyone who cannot see the accent colour.
 */
export function StatusStepper({ status, detail }: { status: MeetingStatus; detail?: string }) {
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const pulse = mounted && !reduced;
  const broken = status === "failed" || status === "quota_blocked";
  // "ready" sits past the last stage so every step reads as done, not still working
  const current = broken ? 1 : status === "ready" ? stages.length : order[status];

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {stages.map((stage, i) => {
          const done = i < current;
          const active = i === current && !broken;
          const failedHere = broken && i === current;

          return (
            <li key={stage.key} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  done && "bg-done-soft text-done-text",
                  active && "bg-said-soft text-said-text",
                  failedHere && "bg-overdue-soft text-overdue-text",
                  !done && !active && !failedHere && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3" aria-hidden />
                ) : failedHere ? (
                  <AlertTriangle className="size-3" aria-hidden />
                ) : active ? (
                  // Same element either way, only the animation differs, so hydration matches
                  <motion.span
                    className="size-1.5 rounded-full bg-current"
                    animate={pulse ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
                    transition={pulse ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
                    aria-hidden
                  />
                ) : (
                  <Clock className="size-3" aria-hidden />
                )}
                {stage.label}
              </span>
              {i < stages.length - 1 && (
                <span className={cn("h-px w-4", done ? "bg-done" : "bg-border")} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

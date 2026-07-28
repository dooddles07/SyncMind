"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useMemo } from "react";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/*
  Adapted from @thegridcn/waveform on 21st.dev. Rewritten so bar heights are generated
  once and the playhead is a clip-path on a MotionValue, instead of setState on every
  frame, which re-rendered every bar 60 times a second.
*/

/** Deterministic, so the server and the client render the same bars. */
function heights(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = Math.sin(i * 0.55) * 0.5 + 0.5;
    const b = Math.sin(i * 0.17 + 1.7) * 0.35 + 0.35;
    const c = Math.sin(i * 1.3 + 0.4) * 0.15 + 0.15;
    return 0.16 + Math.min(1, (a + b + c) / 1.6) * 0.84;
  });
}

function Bars({ values }: { values: number[] }) {
  return (
    <div className="flex h-full items-center gap-[3px]">
      {values.map((h, i) => (
        <span key={i} className="flex h-full flex-1 items-center">
          <span className="w-full rounded-full bg-current" style={{ height: `${h * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

/** Static or gently pulsing waveform. Amber, because it is audio. */
export function Waveform({
  bars = 64,
  live = false,
  className,
}: {
  bars?: number;
  live?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const values = useMemo(() => heights(bars), [bars]);
  // MotionConfig does not stop a repeating opacity loop, so gate this one directly.
  // mounted keeps the first client render identical to the server render.
  const pulse = live && mounted && !reduced;

  return (
    <div className={cn("relative h-16 text-said", className)} aria-hidden>
      <motion.div
        className="h-full"
        animate={pulse ? { opacity: [0.55, 1, 0.7, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <Bars values={values} />
      </motion.div>
    </div>
  );
}

/**
 * The audio spine. Bars left of the playhead are amber, the part that has been heard.
 * Everything right of it stays muted. Driven by a scroll MotionValue.
 */
export function ScrubbableWaveform({
  bars = 96,
  progress,
  className,
}: {
  bars?: number;
  progress: MotionValue<number>;
  className?: string;
}) {
  const values = useMemo(() => heights(bars), [bars]);
  const clip = useTransform(progress, (p) => `inset(0 ${(1 - p) * 100}% 0 0)`);
  const playheadX = useTransform(progress, (p) => `${p * 100}%`);

  return (
    <div className={cn("relative h-20 sm:h-28", className)} aria-hidden>
      <div className="absolute inset-0 text-border">
        <Bars values={values} />
      </div>
      <motion.div className="absolute inset-0 text-said" style={{ clipPath: clip }}>
        <Bars values={values} />
      </motion.div>
      <motion.div
        className="absolute inset-y-0 w-px -translate-x-1/2 bg-said"
        style={{ left: playheadX }}
      >
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-said" />
      </motion.div>
    </div>
  );
}

"use client";

import { CalendarPlus, CheckSquare, Gavel, Mail } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ComponentType } from "react";
import { ScrubbableWaveform, Waveform } from "@/components/waveform";
import { Reveal } from "@/components/ui/reveal";
import { useMediaQuery } from "@/lib/use-media-query";
import { formatTimecode } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
  The signature element. A recording plays across the page as you scroll, and at the
  moments where something was actually said, SyncMind's output detaches from the audio
  and settles below it. Amber is what a person said. Teal is what SyncMind made of it.
*/

type Moment = {
  at: number;
  speaker: string;
  said: string;
  kind: string;
  icon: ComponentType<{ className?: string }>;
  made: string;
  meta: string;
};

const moments: Moment[] = [
  {
    at: 259,
    speaker: "Maya",
    said: "Can you get it to legal by Friday? I don't want this slipping into August.",
    kind: "To-do",
    icon: CheckSquare,
    made: "Send the vendor contract to legal",
    meta: "Dan · due Fri 24 Jul",
  },
  {
    at: 283,
    speaker: "Maya",
    said: "Let's not stack those. We push the pricing change to Q4 and keep this release clean.",
    kind: "Decision",
    icon: Gavel,
    made: "Pricing change moves to Q4",
    meta: "Saved under Decisions",
  },
  {
    at: 1721,
    speaker: "Maya",
    said: "Last thing, Dan, can you send the pricing deck to the client by Sunday?",
    kind: "Calendar",
    icon: CalendarPlus,
    made: "Pricing deck due",
    meta: "Sun 26 Jul · all day",
  },
  {
    at: 3020,
    speaker: "Maya",
    said: "I'll write it all up and send it round tonight.",
    kind: "Email",
    icon: Mail,
    made: "Follow-up drafted, waiting in your Gmail",
    meta: "3 recipients · ready to send",
  },
];

export function TimelineSpine() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  // Below md the sticky frame is shorter than the four cards, so they get clipped.
  // Narrow screens get the same resolved layout as reduced motion.
  const roomy = useMediaQuery("(min-width: 768px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Hold at both ends so the first and last card get a beat on screen
  const progress = useTransform(scrollYProgress, [0, 0.12, 0.9, 1], [0, 0.05, 0.98, 1]);
  const scrubbed = roomy && !reduced;

  return (
    <section
      ref={ref}
      aria-labelledby="spine-heading"
      className={cn("relative", scrubbed ? "h-[340vh]" : "py-20 sm:py-28")}
    >
      <div className={cn("flex flex-col justify-center gap-8", scrubbed && "sticky top-0 h-svh")}>
        <div className="mx-auto w-full max-w-5xl px-5">
          <p className="text-sm font-medium text-said-text">One 52-minute recording</p>
          <h2 id="spine-heading" className="mt-2 max-w-[20ch] text-h1">
            Everything that mattered, pulled out as it was said
          </h2>
        </div>

        <div className="mx-auto w-full max-w-5xl px-5">
          {scrubbed ? (
            <ScrubbableWaveform progress={progress} />
          ) : (
            // No playhead to follow here, so the audio just reads as audio
            <Waveform bars={72} className="h-20" />
          )}
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-3 px-5 sm:grid-cols-2">
          {moments.map((m, i) => (
            <MomentCard
              key={m.at}
              moment={m}
              index={i}
              total={moments.length}
              progress={progress}
              scrubbed={scrubbed}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MomentCard({
  moment,
  index,
  total,
  progress,
  scrubbed,
}: {
  moment: Moment;
  index: number;
  total: number;
  progress: MotionValue<number>;
  scrubbed: boolean;
}) {
  const start = index / total;
  const enter = start + 0.06;
  const opacity = useTransform(progress, [start, enter], [0, 1]);
  const y = useTransform(progress, [start, enter], [18, 0]);
  const Icon = moment.icon;

  const card = (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xs tabular text-said-text">{formatTimecode(moment.at)}</span>
        <span className="text-xs font-medium text-muted-foreground">{moment.speaker} said</span>
      </div>

      <p className="border-l-2 border-said pl-3 text-sm leading-relaxed text-foreground/90">
        {moment.said}
      </p>

      <div className="mt-auto flex items-start gap-2.5 rounded-md bg-done-soft p-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-done-text" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-done-text">{moment.kind}</p>
          <p className="mt-0.5 text-sm font-medium">{moment.made}</p>
          <p className="text-xs text-muted-foreground">{moment.meta}</p>
        </div>
      </div>
    </article>
  );

  // Reduced motion and narrow screens get the finished state, not a frozen half-played one
  if (!scrubbed) return <Reveal className="h-full">{card}</Reveal>;

  return (
    <motion.div style={{ opacity, y }} className="h-full">
      {card}
    </motion.div>
  );
}

"use client";

import { ArrowRight, FileAudio } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Waveform } from "@/components/waveform";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

const outputs = [
  "A transcript of who said what",
  "Notes you can read in a minute",
  "A to-do list with names on it",
  "A follow-up email, already written",
  "Every deadline on your calendar",
];

export function Hero() {
  const step = (i: number) => ({ ...spring, delay: 0.1 + i * 0.07 });

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={step(0)}
              className="inline-flex items-center gap-2 rounded-full bg-said-soft px-3 py-1 text-sm font-medium text-said-text"
            >
              <FileAudio className="size-3.5" aria-hidden />
              No bot joins your call
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={step(1)}
              className="mt-5 text-display"
            >
              You talked for an hour.
              <br />
              <span className="text-done-text">Here is the hour back.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={step(2)}
              className="mt-6 max-w-[46ch] text-lg text-muted-foreground"
            >
              Drop in a meeting recording. SyncMind writes it down, pulls out what was
              decided and who owes what, drafts the follow-up email, and puts the
              deadlines on your calendar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={step(3)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg">
                <Link href="/login">
                  Continue with Google
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Free. No card needed.</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.28 }}
            className="relative"
          >
            <div className="rounded-lg border border-border bg-card p-5 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">q3-planning.m4a</p>
                  <p className="font-mono text-xs tabular text-muted-foreground">52:07</p>
                </div>
                <span className="rounded-full bg-said-soft px-2.5 py-0.5 text-xs font-medium text-said-text">
                  What you gave us
                </span>
              </div>

              <Waveform live className="mt-4" bars={48} />

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">becomes</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <ul className="flex flex-col gap-2">
                {outputs.map((o, i) => (
                  <motion.li
                    key={o}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.45 + i * 0.08 }}
                    className="flex items-center gap-2.5 rounded-md bg-done-soft px-3 py-2 text-sm font-medium text-done-text"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-done" aria-hidden />
                    {o}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/*
  Motion honours prefers-reduced-motion internally, so components never branch on it
  in their markup. Branching in React changes the rendered tree between server and
  client and produces a hydration mismatch, which also scrambles Radix useId values.
  With reducedMotion "user", transform and layout animations are dropped while opacity
  still resolves, so content always ends up visible.
*/
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

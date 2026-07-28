"use client";

import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { rise, stagger, viewportOnce } from "@/lib/motion";

/*
  These never branch on prefers-reduced-motion. MotionConfig in the root layout handles
  it globally, which keeps the server and client trees identical. See motion-provider.
*/

/** Fades and lifts its children in once, the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={viewportOnce}
      variants={rise}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Wraps a list so its children arrive one after another rather than all at once. */
export function RevealGroup({
  children,
  count,
  className,
  ...props
}: { children: ReactNode; count: number } & ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={viewportOnce}
      variants={stagger(count)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}

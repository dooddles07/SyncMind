import type { Transition, Variants } from "motion/react";

// One motion vocabulary for the whole app. Motion explains cause and effect, it never decorates.

export const spring: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };
export const micro: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };
export const exit: Transition = { duration: 0.1, ease: [0.4, 0, 1, 1] };

export const press = { scale: 0.97 };

// Entrance for anything revealed on scroll.
export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: spring },
};

// Parent of a staggered list. Cap the stagger so long lists do not crawl.
export function stagger(count: number, step = 0.04): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: Math.min(step, 0.32 / Math.max(count, 1)) } },
  };
}

export const viewportOnce = { once: true, amount: 0.35 } as const;

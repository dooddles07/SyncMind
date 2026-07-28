"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server cannot know the resolved theme, so everything that depends on it
  // — icon AND label — has to stay stable until after hydration. Gating only the
  // icon leaves the aria-label mismatched, which is both a hydration error and a
  // screen reader announcing the wrong action.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-input-strong text-foreground transition-colors duration-[120ms] ease-out hover:bg-accent"
    >
      {isDark ? (
        <Sun size={20} strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon size={20} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // the resolved theme is unknown on the server, so hold the icon until mount
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-input-strong text-foreground transition-colors duration-[120ms] ease-out hover:bg-accent"
    >
      {mounted && isDark ? (
        <Sun size={20} strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon size={20} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

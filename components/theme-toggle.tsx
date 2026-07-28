"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/*
  Anything derived from resolvedTheme must stay stable until after mount, the icon
  AND the label. Gating only the icon ships a hydration mismatch and makes a screen
  reader announce the wrong action.
*/
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground",
        className,
      )}
    >
      {mounted && isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}

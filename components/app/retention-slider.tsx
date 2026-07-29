"use client";

import { useState } from "react";
import { toast } from "sonner";

export function RetentionSlider({ initial }: { initial: number }) {
  const [days, setDays] = useState(initial);
  const [saved, setSaved] = useState(initial);

  async function commit() {
    if (days === saved) return;
    const res = await fetch("/api/settings/retention", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    if (!res.ok) {
      toast.error("Could not save. Try again.");
      setDays(saved);
      return;
    }
    setSaved(days);
    toast.success(`Now keeping audio for ${days} day${days === 1 ? "" : "s"}.`);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="retention" className="text-sm font-medium">
        Keep audio for <span className="tabular">{days}</span> day{days === 1 ? "" : "s"}
      </label>
      <input
        id="retention"
        type="range"
        min={1}
        max={30}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        aria-describedby="retention-hint"
        className="w-full accent-[var(--done)]"
      />
      <p id="retention-hint" className="text-sm text-muted-foreground">
        Anything between 1 and 30 days.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

export function RetentionSlider({ initial }: { initial: number }) {
  const [days, setDays] = useState(initial);

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
        aria-describedby="retention-hint"
        className="w-full accent-[var(--done)]"
      />
      <p id="retention-hint" className="text-sm text-muted-foreground">
        Anything between 1 and 30 days.
      </p>
    </div>
  );
}

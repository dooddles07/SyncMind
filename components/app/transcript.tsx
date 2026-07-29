"use client";

import { Pause, Play, RotateCcw, RotateCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatTimecode, type Segment, type Speaker } from "@/lib/types";
import { cn } from "@/lib/utils";

const UNKNOWN_SPEAKER: Speaker = { id: "unknown", label: "Unclear who", inferred: true };

export function SpeakerChip({ speaker }: { speaker: Speaker | undefined }) {
  const shown = speaker ?? UNKNOWN_SPEAKER;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
        {shown.label.slice(0, 1)}
      </span>
      <span className="text-sm font-medium">{shown.label}</span>
      {shown.inferred && (
        <Badge tone="guessed" className="px-1.5 py-0 text-[10px]">
          Best guess
        </Badge>
      )}
    </span>
  );
}

export function TranscriptPanel({
  segments,
  speakers,
  duration,
  audioAvailable,
}: {
  segments: Segment[];
  speakers: Speaker[];
  duration: number;
  audioAvailable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(segments[0]?.at ?? 0);
  const [playing, setPlaying] = useState(false);

  const byId = useMemo(
    () => Object.fromEntries(speakers.map((s) => [s.id, s])) as Record<string, Speaker>,
    [speakers],
  );

  const matches = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return new Set(segments.filter((s) => s.text.toLowerCase().includes(q)).map((s) => s.id));
  }, [query, segments]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a word in this meeting"
            aria-label="Find a word in this meeting"
            className="pl-9"
          />
        </div>
        {matches && (
          <p className="text-sm text-muted-foreground">
            <span className="tabular">{matches.size}</span> line
            {matches.size === 1 ? "" : "s"} match
          </p>
        )}
      </div>

      <ol className="flex flex-col">
        {segments.map((s) => {
          const dim = matches ? !matches.has(s.id) : false;
          const here = s.at === at;
          return (
            <li
              key={s.id}
              className={cn(
                "flex gap-4 border-l-2 py-2.5 pl-3 transition-colors duration-150",
                here ? "border-said bg-said-soft/40" : "border-transparent",
                dim && "opacity-40",
              )}
            >
              <button
                type="button"
                onClick={() => setAt(s.at)}
                className="shrink-0 font-mono text-xs tabular text-said-text hover:underline"
              >
                {formatTimecode(s.at)}
                <span className="sr-only">, jump to this moment</span>
              </button>
              <div className="min-w-0">
                <SpeakerChip speaker={byId[s.speakerId]} />
                <p className="mt-1 max-w-[68ch] leading-[1.7]">{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {audioAvailable ? (
        <div className="sticky bottom-0 flex items-center gap-3 rounded-lg border border-border bg-card/95 p-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="inline-flex size-10 items-center justify-center rounded-full bg-done text-done-foreground"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button type="button" aria-label="Back 15 seconds" className="text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-4" />
          </button>
          <button type="button" aria-label="Forward 15 seconds" className="text-muted-foreground hover:text-foreground">
            <RotateCw className="size-4" />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-said" style={{ width: `${(at / duration) * 100}%` }} />
          </div>
          <span className="font-mono text-xs tabular text-muted-foreground">
            {formatTimecode(at)} / {formatTimecode(duration)}
          </span>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          The audio for this meeting was deleted after 7 days. The transcript below is
          all yours to keep.
        </p>
      )}
    </div>
  );
}

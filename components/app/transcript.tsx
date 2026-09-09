"use client";

import { Pause, Play, RotateCcw, RotateCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { locateChunk, type PlayableChunk } from "@/lib/audio/playlist";
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
  meetingId,
  segments,
  speakers,
  duration,
  audioAvailable,
}: {
  meetingId: string;
  segments: Segment[];
  speakers: Speaker[];
  duration: number;
  audioAvailable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(segments[0]?.at ?? 0);
  const [playing, setPlaying] = useState(false);
  const [chunks, setChunks] = useState<PlayableChunk[] | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Which chunk object is loaded into the element, and where to jump once it has
  // enough metadata to accept a currentTime (setting it straight after src is a no-op).
  const loadedIndex = useRef<number | null>(null);
  const pendingOffset = useRef<number | null>(null);

  useEffect(() => {
    if (!audioAvailable) return;
    let cancelled = false;
    fetch(`/api/meetings/${meetingId}/audio`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.chunks) setChunks(data.chunks as PlayableChunk[]);
      })
      .catch(() => {
        // Playback stays unavailable; the transcript itself is unaffected.
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId, audioAvailable]);

  /** Moves playback to a position in the whole recording, loading whichever chunk
   *  holds it first. Every seek in this component goes through here. */
  const seek = useCallback(
    (target: number, play = false) => {
      const clamped = Math.max(0, Math.min(target, duration));
      setAt(clamped);

      const el = audioRef.current;
      const located = chunks ? locateChunk(chunks, clamped) : null;
      if (!el || !located) return;

      if (loadedIndex.current !== located.chunk.index) {
        loadedIndex.current = located.chunk.index;
        pendingOffset.current = located.offsetSec;
        el.src = located.chunk.url;
        el.load();
      } else if (el.readyState === 0) {
        pendingOffset.current = located.offsetSec;
      } else {
        el.currentTime = located.offsetSec;
      }

      if (play) void el.play().catch(() => setPlaying(false));
    },
    [chunks, duration],
  );

  function toggle() {
    const el = audioRef.current;
    if (!el || !chunks?.length) return;
    if (playing) {
      el.pause();
      return;
    }
    if (loadedIndex.current === null) seek(at, true);
    else void el.play().catch(() => setPlaying(false));
  }

  function onLoadedMetadata() {
    const el = audioRef.current;
    if (!el || pendingOffset.current === null) return;
    el.currentTime = pendingOffset.current;
    pendingOffset.current = null;
  }

  function onTimeUpdate() {
    const el = audioRef.current;
    if (!el || !chunks) return;
    const chunk = chunks.find((c) => c.index === loadedIndex.current);
    if (chunk) setAt(chunk.startSec + el.currentTime);
  }

  /** Chunks overlap by 3s, so continuing at the *end* of the finished chunk lands
   *  a few seconds into the next one -- no repeated audio, no gap. */
  function onEnded() {
    const chunk = chunks?.find((c) => c.index === loadedIndex.current);
    const next = chunks?.find((c) => c.index === (loadedIndex.current ?? 0) + 1);
    if (!chunk || !next) {
      setPlaying(false);
      return;
    }
    seek(chunk.startSec + chunk.durationSec, true);
  }

  const playable = (chunks?.length ?? 0) > 0;

  const byId = useMemo(
    () => Object.fromEntries(speakers.map((s) => [s.id, s])) as Record<string, Speaker>,
    [speakers],
  );

  const activeId = useMemo(() => {
    let current = segments[0]?.id;
    for (const segment of segments) {
      if (segment.at <= at + 0.25) current = segment.id;
      else break;
    }
    return current;
  }, [segments, at]);

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
          const here = s.id === activeId;
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
                onClick={() => seek(s.at)}
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
          <audio
            ref={audioRef}
            preload="none"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <button
            type="button"
            onClick={toggle}
            disabled={!playable}
            aria-label={playing ? "Pause" : "Play"}
            className="inline-flex size-10 items-center justify-center rounded-full bg-done text-done-foreground disabled:opacity-50"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => seek(at - 15, playing)}
            disabled={!playable}
            aria-label="Back 15 seconds"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => seek(at + 15, playing)}
            disabled={!playable}
            aria-label="Forward 15 seconds"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RotateCw className="size-4" />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={Math.round(at)}
            onChange={(e) => seek(Number(e.target.value), playing)}
            disabled={!playable}
            aria-label="Seek"
            className="h-1.5 flex-1 accent-said disabled:opacity-50"
          />
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

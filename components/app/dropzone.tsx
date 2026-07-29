"use client";

import { FileAudio, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { chunkAudio, ChunkerError, type AudioChunk } from "@/lib/audio/chunker";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const ACCEPTED = ".mp3,.m4a,.wav,.webm,.ogg,.mp4,.mov";
const PARALLEL_UPLOADS = 2;

async function uploadChunksInParallel(
  chunks: AudioChunk[],
  slots: { index: number; path: string; token: string }[],
  onChunkDone: () => void,
) {
  const supabase = createClient();
  const queue = [...chunks];

  async function worker() {
    let chunk: AudioChunk | undefined;
    while ((chunk = queue.shift())) {
      const slot = slots.find((s) => s.index === chunk!.index);
      if (!slot) continue;
      const { error } = await supabase.storage
        .from("recordings")
        .uploadToSignedUrl(slot.path, slot.token, chunk.blob);
      if (error) throw new Error(`Chunk ${chunk.index} failed to upload: ${error.message}`);
      onChunkDone();
    }
  }

  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
}

export function Dropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "processing" | "uploading">("idle");

  function accept(picked: File) {
    setFile(picked);
    setTitle(picked.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  }

  async function start() {
    if (!file) return;
    setStage("processing");
    setProgress(0);

    let chunkResult;
    try {
      chunkResult = await chunkAudio(file, (ratio) => setProgress(ratio * 0.5));
    } catch (err) {
      setStage("idle");
      toast.error(err instanceof ChunkerError ? err.message : "Could not process this recording.");
      return;
    }

    let created;
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          durationSec: chunkResult.durationSec,
          chunks: chunkResult.chunks.map((c) => ({
            index: c.index,
            startSec: c.startSec,
            durationSec: c.durationSec,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "Could not start this meeting.");
      created = (await res.json()) as { meetingId: string; chunks: { index: number; path: string; token: string }[] };
    } catch (err) {
      setStage("idle");
      toast.error(err instanceof Error ? err.message : "Could not start this meeting.");
      return;
    }

    setStage("uploading");
    const total = chunkResult.chunks.length;
    let done = 0;
    try {
      await uploadChunksInParallel(chunkResult.chunks, created.chunks, () => {
        done += 1;
        setProgress(0.5 + 0.5 * (done / total));
      });
      await fetch(`/api/meetings/${created.meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "transcribing" }),
      });
    } catch (err) {
      setStage("idle");
      toast.error(err instanceof Error ? err.message : "Upload didn't finish. Try again.");
      return;
    }

    toast.success("Uploaded. We will take it from here.");
    router.push(`/meetings/${created.meetingId}`);
  }

  const working = stage !== "idle";

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) accept(dropped);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-150",
          over ? "border-done bg-done-soft" : "border-border bg-card",
        )}
      >
        <UploadCloud className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-h3">Drop a recording here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          mp3, m4a, wav, webm, mp4 or mov. Up to two hours.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) accept(picked);
          }}
        />
      </div>

      {file && (
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <FileAudio className="size-4 shrink-0 text-said-text" aria-hidden />
            <p className="min-w-0 truncate text-sm font-medium">{file.name}</p>
          </div>

          <Field label="What should we call this meeting?">
            {(props) => (
              <Input {...props} value={title} onChange={(e) => setTitle(e.target.value)} disabled={working} />
            )}
          </Field>

          {working ? (
            <div>
              <Progress
                tone="said"
                value={Math.round(progress * 100)}
                max={100}
                label={stage === "processing" ? "Preparing the recording" : "Uploading"}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {stage === "processing"
                  ? "Splitting the recording into pieces in your browser."
                  : "Sending it to SyncMind. You can leave this page, it keeps going."}
              </p>
            </div>
          ) : (
            <Button type="button" onClick={start} disabled={!title.trim()}>
              Start
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { FileAudio, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ACCEPTED = ".mp3,.m4a,.wav,.webm,.ogg,.mp4,.mov";
const TOTAL_PARTS = 6;

export function Dropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [part, setPart] = useState(0);
  const [working, setWorking] = useState(false);

  function accept(name: string) {
    setFile(name);
    setTitle(name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  }

  function start() {
    setWorking(true);
    let n = 0;
    const tick = setInterval(() => {
      n += 1;
      setPart(n);
      if (n >= TOTAL_PARTS) {
        clearInterval(tick);
        toast.success("Uploaded. We will take it from here.");
        router.push("/meetings/q3-planning");
      }
    }, 550);
  }

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
          if (dropped) accept(dropped.name);
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
            if (picked) accept(picked.name);
          }}
        />
      </div>

      {file && (
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <FileAudio className="size-4 shrink-0 text-said-text" aria-hidden />
            <p className="min-w-0 truncate text-sm font-medium">{file}</p>
          </div>

          <Field label="What should we call this meeting?">
            {(props) => (
              <Input {...props} value={title} onChange={(e) => setTitle(e.target.value)} />
            )}
          </Field>

          <Field label="When did it happen?">
            {(props) => <Input {...props} type="date" defaultValue="2026-07-28" />}
          </Field>

          {working ? (
            <div>
              <Progress
                tone="said"
                value={part}
                max={TOTAL_PARTS}
                label={`Uploading part ${part} of ${TOTAL_PARTS}`}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Sending part <span className="tabular">{part}</span> of{" "}
                <span className="tabular">{TOTAL_PARTS}</span>. You can leave this page,
                it keeps going.
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

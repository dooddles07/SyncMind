"use client";

import { Download, FileText, Printer, Subtitles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportMenu({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Download className="size-4" aria-hidden />
        Export
      </Button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
          <a
            href={`/api/meetings/${meetingId}/export?format=md`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <FileText className="size-4" aria-hidden />
            Minutes (Markdown)
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <Printer className="size-4" aria-hidden />
            Minutes (PDF)
          </button>
          <a
            href={`/api/meetings/${meetingId}/export?format=txt`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <FileText className="size-4" aria-hidden />
            Transcript (.txt)
          </a>
          <a
            href={`/api/meetings/${meetingId}/export?format=srt`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <Subtitles className="size-4" aria-hidden />
            Transcript (.srt)
          </a>
        </div>
      )}
    </div>
  );
}

"use client";

import { Download, FileText, Printer, Subtitles } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDismissablePanel } from "@/lib/use-dismissable-panel";

export function ExportMenu({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { panelRef, triggerRef } = useDismissablePanel(open, close);

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Download className="size-4" aria-hidden />
        Export
      </Button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Export options"
          className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg"
        >
          <a
            href={`/api/meetings/${meetingId}/export?format=md`}
            role="menuitem"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <FileText className="size-4" aria-hidden />
            Minutes (Markdown)
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => window.print()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <Printer className="size-4" aria-hidden />
            Minutes (PDF)
          </button>
          <a
            href={`/api/meetings/${meetingId}/export?format=txt`}
            role="menuitem"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <FileText className="size-4" aria-hidden />
            Transcript (.txt)
          </a>
          <a
            href={`/api/meetings/${meetingId}/export?format=srt`}
            role="menuitem"
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

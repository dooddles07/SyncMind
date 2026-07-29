"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ShareLink } from "@/lib/mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDismissablePanel } from "@/lib/use-dismissable-panel";

export function ShareButton({ meetingId, initialLink }: { meetingId: string; initialLink: ShareLink | null }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(initialLink);
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { panelRef, triggerRef } = useDismissablePanel(open, close);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeTranscript }),
      });
      if (!res.ok) {
        toast.error("Could not create a share link.");
        return;
      }
      const created = await res.json();
      setLink({ token: created.token, url: created.url, includeTranscript, viewCount: 0 });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!link) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/share/${link.token}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not revoke the link.");
        return;
      }
      setLink(null);
      toast.success("Link revoked.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    toast.success("Link copied.");
  }

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 className="size-4" aria-hidden />
        Share a read-only link
      </Button>

      {open && (
        <div
          ref={panelRef}
          aria-label="Share this meeting"
          className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-border bg-card p-4 shadow-lg"
        >
          {link ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view a read-only copy of this meeting&apos;s notes.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={link.url} className="text-sm" />
                <Button variant="outline" size="sm" onClick={copy} aria-label="Copy link">
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={revoke} disabled={busy}>
                {busy ? "Revoking…" : "Revoke link"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeTranscript}
                  onChange={(e) => setIncludeTranscript(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                Include the full transcript
              </label>
              <Button size="sm" onClick={create} disabled={busy}>
                <Check className="size-4" aria-hidden />
                {busy ? "Creating…" : "Create link"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

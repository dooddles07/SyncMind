"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteMeetingButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete this meeting. Try again.");
        return;
      }
      toast.success("Meeting deleted.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden />
        Delete meeting
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">This can&apos;t be undone.</span>
      <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
        {deleting ? "Deleting…" : "Yes, delete it"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
        Cancel
      </Button>
    </div>
  );
}

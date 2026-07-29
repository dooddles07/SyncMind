"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

const CONFIRM_TEXT = "DELETE";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete your data. Try again.");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Delete all my data
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-overdue bg-overdue-soft p-4">
      <p className="text-sm">
        This permanently deletes every recording, transcript, note, and to-do, and signs
        you out. There is no undo. Type <span className="font-mono font-semibold">DELETE</span> to
        confirm.
      </p>
      <Field label="Confirmation">
        {(props) => (
          <Input {...props} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
        )}
      </Field>
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={confirmDelete}
          disabled={confirmText !== CONFIRM_TEXT || deleting}
        >
          {deleting ? "Deleting…" : "Permanently delete everything"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={deleting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

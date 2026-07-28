"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { EmailDraft, EmailTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones: { value: EmailTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "brief", label: "Short" },
];

export function EmailComposer({ draft }: { draft: EmailDraft }) {
  const [tone, setTone] = useState(draft.tone);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
        SyncMind can only put this in your Gmail drafts. It cannot send email as you,
        so nothing goes out until you press send yourself.
      </p>

      <div>
        <p id="tone-label" className="mb-2 text-sm font-medium">
          How should it sound?
        </p>
        <div role="radiogroup" aria-labelledby="tone-label" className="flex flex-wrap gap-2">
          {tones.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tone === t.value}
              onClick={() => setTone(t.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                tone === t.value
                  ? "border-done bg-done-soft text-done-text"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Who it goes to">
        {(props) => <Input {...props} defaultValue={draft.recipients.join(", ")} />}
      </Field>

      <Field label="Subject">
        {(props) => (
          <Input {...props} value={subject} onChange={(e) => setSubject(e.target.value)} />
        )}
      </Field>

      <Field label="Message" hint="Edit anything. What you see here is exactly what gets saved.">
        {(props) => (
          <Textarea
            {...props}
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-80 font-sans leading-relaxed"
          />
        )}
      </Field>

      <div>
        <Button onClick={() => toast.success("Saved to your Gmail drafts")}>
          <Mail className="size-4" aria-hidden />
          Save to my Gmail drafts
        </Button>
      </div>
    </div>
  );
}

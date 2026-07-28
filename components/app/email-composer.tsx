"use client";

import { Copy, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  asPlainText,
  gmailComposeUrl,
  isTooLongForCompose,
  mailtoUrl,
  type Compose,
} from "@/lib/export/gmail";
import type { EmailDraft, EmailTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones: { value: EmailTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "brief", label: "Short" },
];

function parseRecipients(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function EmailComposer({ draft }: { draft: EmailDraft }) {
  const [tone, setTone] = useState(draft.tone);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [to, setTo] = useState(draft.recipients.join(", "));

  const compose: Compose = { to: parseRecipients(to), subject, body };
  const tooLong = isTooLongForCompose(compose);

  async function copy() {
    await navigator.clipboard.writeText(asPlainText(compose));
    toast.success("Copied. Paste it into any email you like.");
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
        SyncMind is not connected to your email. This opens a new message in your own
        Gmail with everything already filled in. You are the one who presses send.
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

      <Field label="Who it goes to" hint="Separate addresses with a comma.">
        {(props) => <Input {...props} value={to} onChange={(e) => setTo(e.target.value)} />}
      </Field>

      <Field label="Subject">
        {(props) => (
          <Input {...props} value={subject} onChange={(e) => setSubject(e.target.value)} />
        )}
      </Field>

      <Field label="Message" hint="Edit anything. What you see here is exactly what Gmail opens with.">
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!tooLong && (
            <Button asChild>
              <a href={gmailComposeUrl(compose)} target="_blank" rel="noopener noreferrer">
                <Mail className="size-4" aria-hidden />
                Open this in Gmail
              </a>
            </Button>
          )}
          <Button variant={tooLong ? "primary" : "outline"} onClick={copy}>
            <Copy className="size-4" aria-hidden />
            {tooLong ? "Copy the whole thing" : "Copy it instead"}
          </Button>
        </div>

        {tooLong ? (
          <p className="text-sm text-muted-foreground">
            This one is too long to hand to Gmail through a link without losing the end
            of it. Copy it and paste it into a new message.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not a Gmail user?{" "}
            <a
              href={mailtoUrl(compose)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Open it in your usual mail app
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimecode, type AskExchange } from "@/lib/types";

export function AskPanel({ history: initialHistory, meetingId }: { history: AskExchange[]; meetingId: string }) {
  const [history, setHistory] = useState(initialHistory);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setAsking(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload?.error?.message ?? "Could not get an answer.");
        return;
      }
      const row = payload.query;
      setHistory((prev) => [
        ...prev,
        {
          id: row.id,
          question: row.question,
          answer: row.answer,
          citations: (row.citations as { atSec: number }[]).map((c) => c.atSec),
        },
      ]);
      setQuestion("");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="ask" className="mb-1.5 block text-sm font-medium">
            Ask anything about this meeting
          </label>
          <Input
            id="ask"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Did we agree a date for the contract?"
          />
        </div>
        <Button type="submit" disabled={!question.trim() || asking}>
          <CornerDownLeft className="size-4" aria-hidden />
          {asking ? "Asking…" : "Ask"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Answers only come from what was actually said. If it is not in the recording,
        SyncMind tells you rather than making something up.
      </p>

      <ol className="flex flex-col gap-4">
        {history.map((x) => (
          <li key={x.id} className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">{x.question}</p>
            <p className="mt-2 max-w-[62ch] text-muted-foreground">{x.answer}</p>
            {x.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Heard at</span>
                {x.citations.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="rounded-full bg-said-soft px-2 py-0.5 font-mono text-xs tabular text-said-text hover:underline"
                  >
                    {formatTimecode(c)}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

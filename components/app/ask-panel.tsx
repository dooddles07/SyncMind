"use client";

import { CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimecode, type AskExchange } from "@/lib/types";

export function AskPanel({ history }: { history: AskExchange[] }) {
  const [question, setQuestion] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
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
        <Button type="submit" disabled={!question.trim()}>
          <CornerDownLeft className="size-4" aria-hidden />
          Ask
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

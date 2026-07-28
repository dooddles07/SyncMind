"use client";

import { CalendarCheck, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTimecode, isOverdue, type Todo } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityTone = { high: "overdue", medium: "said", low: "neutral" } as const;

export function TodoTable({ initial }: { initial: Todo[] }) {
  const [todos, setTodos] = useState(initial);
  const undated = todos.filter((t) => !t.due).length;
  const addable = todos.filter((t) => t.due && !t.onCalendar).length;

  function addAll() {
    setTodos((all) => all.map((t) => (t.due ? { ...t, onCalendar: true } : t)));
    toast.success(`Saved ${addable} to your calendar`);
  }

  function addOne(id: string) {
    setTodos((all) => all.map((t) => (t.id === id ? { ...t, onCalendar: true } : t)));
    toast.success("Saved to your calendar");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular">{todos.length}</span> to-do
          {todos.length === 1 ? "" : "s"} came out of this meeting
          {undated > 0 && <>, {undated} without a date</>}.
        </p>
        {addable > 0 && (
          <Button size="sm" variant="outline" onClick={addAll}>
            <CalendarPlus className="size-4" aria-hidden />
            Save all {addable} dates to my calendar
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {todos.map((t) => {
          const late = isOverdue(t);
          return (
            <li
              key={t.id}
              className={cn(
                "flex flex-wrap items-start gap-x-4 gap-y-2 rounded-md border bg-card p-3",
                // the Overdue badge already says this in words, the tint is only a nudge
                late ? "border-overdue/40" : "border-border",
              )}
            >
              <div className="min-w-48 flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t.owner}
                  {t.due && (
                    <>
                      {" · due "}
                      <span className="tabular">{formatDate(t.due)}</span>
                    </>
                  )}
                  {" · said at "}
                  <span className="font-mono text-xs tabular text-said-text">
                    {formatTimecode(t.at)}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {late && <Badge tone="overdue">Overdue</Badge>}
                {t.ownerInferred && <Badge tone="guessed">Owner is a guess</Badge>}
                <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                {t.due &&
                  (t.onCalendar ? (
                    <Badge tone="done">
                      <CalendarCheck className="size-3" aria-hidden />
                      On your calendar
                    </Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => addOne(t.id)}>
                      <CalendarPlus className="size-4" aria-hidden />
                      Save the date
                    </Button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

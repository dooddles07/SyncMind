"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate, isOverdue, type Todo, type TodoStatus } from "@/lib/types";
import { spring } from "@/lib/motion";

const columns: { key: TodoStatus; label: string }[] = [
  { key: "todo", label: "Not started" },
  { key: "doing", label: "In progress" },
  { key: "done", label: "Done" },
];

/*
  Status is changed with a select on every card rather than drag and drop. It works with
  a keyboard and a screen reader by default, needs no drag library, and is faster on a
  phone. Motion's layout prop animates the card to its new column so the move is tracked.
*/
export function TodoBoard({ initial }: { initial: Todo[] }) {
  const [todos, setTodos] = useState(initial);
  const [owner, setOwner] = useState("all");
  const [lateOnly, setLateOnly] = useState(false);

  const owners = useMemo(() => [...new Set(initial.map((t) => t.owner))].sort(), [initial]);

  const visible = todos.filter(
    (t) => (owner === "all" || t.owner === owner) && (!lateOnly || isOverdue(t)),
  );

  function move(id: string, status: TodoStatus) {
    setTodos((all) => all.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="owner" className="text-sm font-medium">
            Whose?
          </label>
          <select
            id="owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="all">Everyone</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={lateOnly}
            onChange={(e) => setLateOnly(e.target.checked)}
            className="size-4 accent-[var(--done)]"
          />
          Overdue only
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const items = visible.filter((t) => t.status === col.key);
          return (
            <section key={col.key} aria-labelledby={`col-${col.key}`} className="flex flex-col gap-3">
              <h2 id={`col-${col.key}`} className="flex items-baseline gap-2 text-h3">
                {col.label}
                <span className="tabular text-sm font-normal text-muted-foreground">
                  {items.length}
                </span>
              </h2>

              <ul className="flex min-h-24 flex-col gap-2 rounded-lg border border-dashed border-border p-2">
                <AnimatePresence initial={false}>
                  {items.map((t) => {
                    const late = isOverdue(t);
                    const card = (
                      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.owner}
                          {t.due && (
                            <>
                              {" · "}
                              <span className="tabular">{formatDate(t.due)}</span>
                            </>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{t.meetingTitle}</p>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {late && <Badge tone="overdue">Overdue</Badge>}
                          {t.ownerInferred && <Badge tone="guessed">Owner is a guess</Badge>}
                        </div>

                        <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="sr-only sm:not-sr-only">Move to</span>
                          <select
                            value={t.status}
                            onChange={(e) => move(t.id, e.target.value as TodoStatus)}
                            aria-label={`Move "${t.title}" to another column`}
                            className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs"
                          >
                            {columns.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );

                    return (
                      <motion.li
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                        transition={spring}
                      >
                        {card}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>

                {items.length === 0 && (
                  <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Nothing here
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

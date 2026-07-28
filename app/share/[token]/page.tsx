import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { NotesPanel } from "@/components/app/notes-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMeeting, getNotes, getTodos } from "@/lib/mock/data";
import { formatDate, formatDuration, formatTimecode } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shared notes",
  robots: { index: false, follow: false },
};

export default async function SharePage() {
  const meeting = await getMeeting("q3-planning");
  const [notes, todos] = await Promise.all([getNotes("q3-planning"), getTodos("q3-planning")]);
  if (!meeting) return null;

  return (
    <div className="min-h-svh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Wordmark />
          <Badge>Read-only</Badge>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-h1">{meeting.title}</h1>
        <p className="mt-1 text-muted-foreground">
          <span className="tabular">{formatDate(meeting.date)}</span> ·{" "}
          <span className="tabular">{formatDuration(meeting.duration)}</span> · shared from SyncMind
        </p>

        <div className="mt-8">
          <NotesPanel notes={notes} />
        </div>

        <section className="mt-10 flex flex-col gap-3">
          <h2 className="text-h3">To-dos</h2>
          <ul className="flex flex-col gap-2">
            {todos.map((t) => (
              <li key={t.id} className="rounded-md border border-border bg-card p-3">
                <p className="text-sm font-medium">{t.title}</p>
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
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 px-5">
          <p className="text-sm text-muted-foreground">
            These notes were written by SyncMind from a meeting recording.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Try it on your own meeting</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}

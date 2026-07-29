import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { NotesPanel } from "@/components/app/notes-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/server/config/supabase-admin";
import { getActionItems } from "@/server/models/action-item-model";
import { getMeetingById } from "@/server/models/meeting-model";
import { getShareLinkByToken, incrementShareLinkViewCount } from "@/server/models/share-link-model";
import { getSummaryForMeeting } from "@/server/models/summary-model";
import { getSegmentsForMeeting } from "@/server/models/transcript-model";
import { formatDate, formatDuration, formatTimecode, type Notes, type Todo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shared notes",
  robots: { index: false, follow: false },
};

function toNotes(summary: Awaited<ReturnType<typeof getSummaryForMeeting>>): Notes {
  if (!summary) return { overview: "", topics: [], decisions: [], questions: [] };
  const topics = summary.topics as { title: string; atSec: number }[];
  const decisions = summary.decisions as { text: string; atSec: number }[];
  const questions = summary.open_questions as { text: string; atSec: number }[];
  return {
    overview: summary.overview,
    topics: topics.map((t, i) => ({ id: `topic-${i}`, text: t.title, at: t.atSec })),
    decisions: decisions.map((d, i) => ({ id: `decision-${i}`, text: d.text, at: d.atSec })),
    questions: questions.map((q, i) => ({ id: `question-${i}`, text: q.text, at: q.atSec })),
  };
}

function toTodos(rows: Awaited<ReturnType<typeof getActionItems>>): Todo[] {
  return rows.map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    meetingTitle: row.meetings?.title ?? "",
    title: row.title,
    owner: row.owner_name ?? "Unassigned",
    ownerInferred: row.ai_generated && !row.edited_by_user,
    due: row.due_date,
    priority: row.priority,
    status: row.status === "in_progress" ? "doing" : row.status,
    at: row.source_sec ?? 0,
  }));
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const link = await getShareLinkByToken(supabase, token);
  if (!link) notFound();

  const meeting = await getMeetingById(supabase, link.meeting_id);
  if (!meeting) notFound();

  const [summary, actionItemRows, transcriptSegments] = await Promise.all([
    getSummaryForMeeting(supabase, meeting.id),
    getActionItems(supabase, meeting.id),
    link.include_transcript ? getSegmentsForMeeting(supabase, meeting.id) : Promise.resolve(null),
  ]);
  await incrementShareLinkViewCount(supabase, token, link.view_count);

  const notes = toNotes(summary);
  const todos = toTodos(actionItemRows);

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
          <span className="tabular">{formatDate(meeting.meeting_date)}</span> ·{" "}
          <span className="tabular">{formatDuration(meeting.duration_sec)}</span> · shared from SyncMind
        </p>

        <div className="mt-8">
          <NotesPanel notes={notes} />
        </div>

        <section className="mt-10 flex flex-col gap-3">
          <h2 className="text-h3">To-dos</h2>
          {todos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No to-dos for this meeting.</p>
          ) : (
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
          )}
        </section>

        {transcriptSegments && (
          <section className="mt-10 flex flex-col gap-3">
            <h2 className="text-h3">Transcript</h2>
            <ul className="flex flex-col gap-2">
              {transcriptSegments.map((s) => (
                <li key={s.id} className="text-sm">
                  <span className="mr-2 font-mono text-xs tabular text-said-text">
                    {formatTimecode(s.start_sec)}
                  </span>
                  {s.text}
                </li>
              ))}
            </ul>
          </section>
        )}
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

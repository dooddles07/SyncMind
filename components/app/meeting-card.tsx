import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDuration, statusCopy, type Meeting, type Todo } from "@/lib/types";
import { isOverdue } from "@/lib/types";

export function MeetingCard({ meeting, todos }: { meeting: Meeting; todos: Todo[] }) {
  const mine = todos.filter((t) => t.meetingId === meeting.id);
  const open = mine.filter((t) => t.status !== "done").length;
  const late = mine.filter((t) => isOverdue(t)).length;
  const copy = statusCopy[meeting.status];
  const working = meeting.status === "transcribing" || meeting.status === "analyzing";

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors duration-150 hover:border-done/50"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-h3">{meeting.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="tabular">{formatDate(meeting.date)}</span> ·{" "}
            <span className="tabular">{formatDuration(meeting.duration)}</span>
            {open > 0 && <> · {open} to-do{open === 1 ? "" : "s"} left</>}
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {meeting.status === "ready" ? (
          <Badge tone="done" dot>
            Ready
          </Badge>
        ) : meeting.status === "failed" ? (
          <Badge tone="overdue">
            <AlertTriangle className="size-3" aria-hidden />
            {copy.label}
          </Badge>
        ) : (
          <Badge tone="said" dot>
            {copy.label}
          </Badge>
        )}

        {late > 0 && <Badge tone="overdue">{late} overdue</Badge>}
        {!meeting.audioAvailable && <Badge>Audio deleted</Badge>}
      </div>

      {working && (
        <div className="mt-3">
          <Progress
            tone="said"
            value={meeting.chunksDone}
            max={meeting.chunksTotal}
            label={`${copy.label}, part ${meeting.chunksDone} of ${meeting.chunksTotal}`}
          />
          <p className="mt-1.5 text-sm text-muted-foreground">
            Part <span className="tabular">{meeting.chunksDone}</span> of{" "}
            <span className="tabular">{meeting.chunksTotal}</span>. You can close this page,
            it keeps going.
          </p>
        </div>
      )}

      {meeting.note && <p className="mt-3 text-sm text-muted-foreground">{meeting.note}</p>}
    </Link>
  );
}

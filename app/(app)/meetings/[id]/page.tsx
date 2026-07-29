import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AskPanel } from "@/components/app/ask-panel";
import { DeleteMeetingButton } from "@/components/app/delete-meeting-button";
import { EmailComposer } from "@/components/app/email-composer";
import { ExportMenu } from "@/components/app/export-menu";
import { NotesPanel } from "@/components/app/notes-panel";
import { PipelinePoller } from "@/components/app/pipeline-poller";
import { PrintMinutes } from "@/components/app/print-minutes";
import { ShareButton } from "@/components/app/share-button";
import { TodoTable } from "@/components/app/todo-table";
import { TranscriptPanel } from "@/components/app/transcript";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAskHistory,
  getEmailDraft,
  getMeeting,
  getNotes,
  getShareLink,
  getSpeakers,
  getTodos,
  getTranscript,
} from "@/lib/mock/data";
import { formatDate, formatDuration, statusCopy } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meeting = await getMeeting(id);
  return { title: meeting?.title ?? "Meeting" };
}

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const [segments, speakers, notes, todos, draft, history, shareLink] = await Promise.all([
    getTranscript(id),
    getSpeakers(id),
    getNotes(id),
    getTodos(id),
    getEmailDraft(id),
    getAskHistory(id),
    getShareLink(id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All meetings
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-h1">{meeting.title}</h1>
            <p className="mt-1 text-muted-foreground">
              <span className="tabular">{formatDate(meeting.date)}</span> ·{" "}
              <span className="tabular">{formatDuration(meeting.duration)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <ExportMenu meetingId={meeting.id} />
            <ShareButton meetingId={meeting.id} initialLink={shareLink} />
            <DeleteMeetingButton meetingId={meeting.id} />
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <PipelinePoller
          meetingId={meeting.id}
          initialStatus={meeting.status}
          initialDetail={meeting.note ?? statusCopy[meeting.status].hint}
        />
      </div>

      <div className="print:hidden">
        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="todos">To-dos</TabsTrigger>
            <TabsTrigger value="email">Follow-up</TabsTrigger>
            <TabsTrigger value="ask">Ask</TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            <NotesPanel notes={notes} />
          </TabsContent>
          <TabsContent value="transcript">
            <TranscriptPanel
              segments={segments}
              speakers={speakers}
              duration={meeting.duration}
              audioAvailable={meeting.audioAvailable}
            />
          </TabsContent>
          <TabsContent value="todos">
            <TodoTable initial={todos} meetingTitle={meeting.title} />
          </TabsContent>
          <TabsContent value="email">
            <EmailComposer draft={draft} meetingId={meeting.id} />
          </TabsContent>
          <TabsContent value="ask">
            <AskPanel history={history} meetingId={meeting.id} />
          </TabsContent>
        </Tabs>
      </div>

      <PrintMinutes meeting={meeting} notes={notes} todos={todos} />
    </div>
  );
}

import { Mic, Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { MeetingCard } from "@/components/app/meeting-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getMeetings, getTodos, getUsage } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Meetings" };

export default async function DashboardPage() {
  const [meetings, todos, usage] = await Promise.all([getMeetings(), getTodos(), getUsage()]);
  const left = usage.minutesLimit - usage.minutesUsed;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Meetings</h1>
          <p className="mt-1 text-muted-foreground">
            Everything you have uploaded, newest first.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="size-4" aria-hidden />
            New meeting
          </Link>
        </Button>
      </div>

      {left < usage.minutesLimit * 0.4 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              <span className="tabular">{left}</span> free minutes left today
            </p>
            <p className="text-sm text-muted-foreground">Resets at midnight</p>
          </div>
          <Progress
            className="mt-2"
            value={usage.minutesUsed}
            max={usage.minutesLimit}
            label={`${usage.minutesUsed} of ${usage.minutesLimit} minutes used today`}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            If you run out, your next meeting waits in the queue instead of failing.
          </p>
        </div>
      )}

      <Input type="search" placeholder="Search every meeting" aria-label="Search every meeting" />

      {meetings.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No meetings yet"
          description="Upload a recording and you will have notes, to-dos and a draft email in a few minutes."
          action={
            <Button asChild>
              <Link href="/upload">Upload a recording</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {meetings.map((m) => (
            <li key={m.id}>
              <MeetingCard meeting={m} todos={todos} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

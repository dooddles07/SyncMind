import { X } from "lucide-react";
import type { Metadata } from "next";
import { RetentionSlider } from "@/components/app/retention-slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getUsage } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Settings" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-h3">{title}</h2>
      <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const usage = await getUsage();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-h1">Settings</h1>
        <p className="mt-1 text-muted-foreground">Your account, your data, your limits.</p>
      </div>

      <Section title="You" description="This is the Google account SyncMind is signed in with.">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold">
            M
          </span>
          <div>
            <p className="font-medium">Maya Osei</p>
            <p className="text-sm text-muted-foreground">maya@example.com</p>
          </div>
        </div>
      </Section>

      <Section
        title="What SyncMind can reach in your Google account"
        description="Your name and your email address, so you can sign in. That is the whole list."
      >
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2">
            <X className="size-4 text-muted-foreground" aria-hidden />
            It cannot read your email
            <Badge tone="done">No access</Badge>
          </li>
          <li className="flex items-center gap-2">
            <X className="size-4 text-muted-foreground" aria-hidden />
            It cannot send email as you
            <Badge tone="done">No access</Badge>
          </li>
          <li className="flex items-center gap-2">
            <X className="size-4 text-muted-foreground" aria-hidden />
            It cannot see or change your calendar
            <Badge tone="done">No access</Badge>
          </li>
        </ul>
        <p className="mt-4 max-w-[60ch] text-sm text-muted-foreground">
          Follow-up emails open in your own Gmail with the text filled in, and dates
          download as a calendar file you open yourself. SyncMind never holds the keys.
        </p>
      </Section>

      <Section
        title="How long recordings stick around"
        description="Your audio is deleted automatically after this many days. Notes, to-dos and transcripts are always kept."
      >
        <RetentionSlider initial={usage.retentionDays} />
      </Section>

      <Section
        title="Today's free minutes"
        description="SyncMind runs on free plans, so there is a daily ceiling. Go over it and your meeting waits for tomorrow rather than failing."
      >
        <Progress
          value={usage.minutesUsed}
          max={usage.minutesLimit}
          label={`${usage.minutesUsed} of ${usage.minutesLimit} minutes used today`}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="tabular">{usage.minutesUsed}</span> of{" "}
          <span className="tabular">{usage.minutesLimit}</span> minutes used. Resets at midnight.
        </p>
      </Section>

      <Section
        title="Delete everything"
        description="This removes every recording, transcript, note and to-do in your account. It cannot be undone."
      >
        <Button variant="danger" size="sm">
          Delete all my data
        </Button>
      </Section>
    </div>
  );
}

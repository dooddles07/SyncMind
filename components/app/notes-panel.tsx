import { CircleHelp, Gavel, ListTree } from "lucide-react";
import { formatTimecode, type NoteItem, type Notes } from "@/lib/types";

function Group({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: typeof Gavel;
  title: string;
  items: NoteItem[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-h3">
        <Icon className="size-4 text-done-text" aria-hidden />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-md border border-border bg-card p-3">
              <span className="shrink-0 font-mono text-xs tabular text-said-text">
                {formatTimecode(item.at)}
              </span>
              <p className="max-w-[62ch] text-sm">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NotesPanel({ notes }: { notes: Notes }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h3 className="text-h3">The short version</h3>
        <p className="max-w-[66ch] leading-relaxed text-foreground/90">{notes.overview}</p>
      </section>

      <Group
        icon={ListTree}
        title="What you talked about"
        items={notes.topics}
        empty="Nothing stood out as a topic in this one."
      />
      <Group
        icon={Gavel}
        title="What you decided"
        items={notes.decisions}
        empty="No decisions were made in this meeting."
      />
      <Group
        icon={CircleHelp}
        title="Still open"
        items={notes.questions}
        empty="Nothing was left hanging."
      />
    </div>
  );
}

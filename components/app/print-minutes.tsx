import { formatDate, formatDuration, formatTimecode, type Meeting, type NoteItem, type Notes, type Todo } from "@/lib/types";

/** PDF export is the browser's own print dialog (docs/ARCHITECTURE.md section 5 --
 *  client-side via a print stylesheet, not a server route). This renders
 *  server-side alongside the interactive Tabs UI, hidden on screen (`hidden
 *  print:block`) and swapped in only when printing -- plain static markup, not
 *  NotesPanel's interactive citation buttons, which don't mean anything on paper. */
function Section({ title, items, empty }: { title: string; items: NoteItem[]; empty: string }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{title}</h2>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.text} ({formatTimecode(item.at)})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PrintMinutes({ meeting, notes, todos }: { meeting: Meeting; notes: Notes; todos: Todo[] }) {
  return (
    <div className="hidden print:block" style={{ color: "black", background: "white" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{meeting.title}</h1>
      <p>
        {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
      </p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Overview</h2>
        <p>{notes.overview || "No overview available yet."}</p>
      </section>

      <Section title="Topics" items={notes.topics} empty="Nothing stood out as a topic in this one." />
      <Section title="Decisions" items={notes.decisions} empty="No decisions were made in this meeting." />
      <Section title="Open Questions" items={notes.questions} empty="Nothing was left hanging." />

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Action Items</h2>
        {todos.length === 0 ? (
          <p>No action items for this meeting.</p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>
                {todo.title} — {todo.owner}
                {todo.ownerInferred ? " (guessed)" : ""}
                {todo.due ? ` — due ${formatDate(todo.due)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#555" }}>
        Written by SyncMind from a meeting recording.
      </p>
    </div>
  );
}

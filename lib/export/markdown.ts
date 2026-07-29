// Minutes-as-Markdown export (docs/PRODUCT-REQUIREMENTS.md F12). Same copy
// register as components/app/notes-panel.tsx's empty states, so the exported
// file reads like the product, not a raw data dump.
import { formatDate, formatDuration, formatTimecode, type Meeting, type NoteItem, type Notes, type Todo } from "@/lib/types";

function section(title: string, items: NoteItem[], empty: string): string {
  if (items.length === 0) return `## ${title}\n\n${empty}\n`;
  const lines = items.map((item) => `- ${item.text} (${formatTimecode(item.at)})`);
  return `## ${title}\n\n${lines.join("\n")}\n`;
}

function actionItemsSection(todos: Todo[]): string {
  if (todos.length === 0) return "## Action Items\n\nNo action items for this meeting.\n";
  const lines = todos.map((todo) => {
    const owner = todo.ownerInferred ? `${todo.owner} (guessed)` : todo.owner;
    const due = todo.due ? ` — due ${formatDate(todo.due)}` : "";
    return `- [ ] ${todo.title} — ${owner}${due}`;
  });
  return `## Action Items\n\n${lines.join("\n")}\n`;
}

export function buildMarkdown(meeting: Meeting, notes: Notes, todos: Todo[]): string {
  return [
    `# ${meeting.title}`,
    "",
    `${formatDate(meeting.date)} · ${formatDuration(meeting.duration)}`,
    "",
    "## Overview",
    "",
    notes.overview || "No overview available yet.",
    "",
    section("Topics", notes.topics, "Nothing stood out as a topic in this one."),
    section("Decisions", notes.decisions, "No decisions were made in this meeting."),
    section("Open Questions", notes.questions, "Nothing was left hanging."),
    actionItemsSection(todos),
    "---",
    "Written by SyncMind from a meeting recording.",
  ].join("\n");
}

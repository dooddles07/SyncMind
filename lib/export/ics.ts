// RFC 5545 calendar export. No Google API and no OAuth: the file opens in Google
// Calendar, Outlook, or Apple Calendar, and nothing about it can expire.

import { formatTimecode, type Todo } from "@/lib/types";

type DatedTodo = Todo & { due: string };

const encoder = new TextEncoder();

/** Escapes the characters RFC 5545 reserves inside a text value. */
function esc(value: string): string {
  return value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets; continuation lines start with a single space. */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      out.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n");
}

/** 2026-07-28T09:12:00Z -> 20260728T091200Z */
function stamp(at: Date): string {
  return `${at.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

/** 2026-07-24 -> 20260724 */
function dateValue(iso: string): string {
  return iso.replace(/-/g, "");
}

/** All-day events end on the following day, which is exclusive in RFC 5545. */
function dayAfter(iso: string): string {
  const at = new Date(`${iso}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return dateValue(at.toISOString().slice(0, 10));
}

function describe(todo: DatedTodo): string {
  const owner = todo.ownerInferred ? `${todo.owner} (SyncMind's guess)` : todo.owner;
  return [
    `Owner: ${owner}`,
    `From "${todo.meetingTitle}", said at ${formatTimecode(todo.at)}.`,
    "Written by SyncMind from a meeting recording.",
  ].join("\n");
}

export function datedTodos(todos: Todo[]): DatedTodo[] {
  return todos.filter((t): t is DatedTodo => Boolean(t.due));
}

/** One all-day VEVENT per to-do that has a due date. Undated to-dos are skipped. */
export function buildIcs(todos: Todo[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyncMind//To-dos//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const todo of datedTodos(todos)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${todo.id}@syncmind.app`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${dateValue(todo.due)}`,
      `DTEND;VALUE=DATE:${dayAfter(todo.due)}`,
      `SUMMARY:${esc(todo.title)}`,
      `DESCRIPTION:${esc(describe(todo))}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** "Send the vendor contract to legal" -> "send-the-vendor-contract-to-legal" */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "syncmind"
  );
}

export function downloadIcs(todos: Todo[], name: string): void {
  const blob = new Blob([buildIcs(todos)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(name)}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

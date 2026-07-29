import { describe, expect, it } from "vitest";
import { buildMarkdown } from "@/lib/export/markdown";
import type { Meeting, Notes, Todo } from "@/lib/types";

const meeting: Meeting = {
  id: "m1",
  title: "Q3 planning",
  date: "2026-07-24",
  duration: 3661,
  status: "ready",
  chunksDone: 1,
  chunksTotal: 1,
  audioAvailable: true,
};

const emptyNotes: Notes = { overview: "", topics: [], decisions: [], questions: [] };

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: "t1",
    meetingId: "m1",
    meetingTitle: "Q3 planning",
    title: "Send the vendor contract to legal",
    owner: "Dan",
    ownerInferred: false,
    due: "2026-07-25",
    priority: "high",
    status: "todo",
    at: 259,
    ...overrides,
  };
}

describe("buildMarkdown", () => {
  it("includes the title, date, and duration", () => {
    const md = buildMarkdown(meeting, emptyNotes, []);
    expect(md).toContain("# Q3 planning");
    expect(md).toContain("Jul 24");
    expect(md).toContain("1h 1m");
  });

  it("uses the same empty-state copy as NotesPanel when sections are empty", () => {
    const md = buildMarkdown(meeting, emptyNotes, []);
    expect(md).toContain("Nothing stood out as a topic in this one.");
    expect(md).toContain("No decisions were made in this meeting.");
    expect(md).toContain("Nothing was left hanging.");
    expect(md).toContain("No action items for this meeting.");
  });

  it("renders real topics/decisions/questions with their timestamps", () => {
    const notes: Notes = {
      overview: "A short recap.",
      topics: [{ id: "topic-0", text: "Roadmap", at: 65 }],
      decisions: [{ id: "decision-0", text: "Ship by Friday", at: 130 }],
      questions: [{ id: "question-0", text: "Who owns QA?", at: 200 }],
    };
    const md = buildMarkdown(meeting, notes, []);
    expect(md).toContain("A short recap.");
    expect(md).toContain("- Roadmap (01:05)");
    expect(md).toContain("- Ship by Friday (02:10)");
    expect(md).toContain("- Who owns QA? (03:20)");
  });

  it("renders action items with owner and due date, marking a guessed owner", () => {
    const md = buildMarkdown(meeting, emptyNotes, [
      todo({ owner: "Dan", ownerInferred: false, due: "2026-07-25" }),
      todo({ id: "t2", title: "Follow up with client", owner: "Someone", ownerInferred: true, due: null }),
    ]);
    expect(md).toContain("- [ ] Send the vendor contract to legal — Dan — due Jul 25");
    expect(md).toContain("- [ ] Follow up with client — Someone (guessed)");
  });
});

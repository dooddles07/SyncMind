import { describe, expect, it } from "vitest";
import { buildIcs, datedTodos, slugify } from "@/lib/export/ics";
import type { Todo } from "@/lib/types";

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: "t1",
    meetingId: "m1",
    meetingTitle: "Q3 planning",
    title: "Send the vendor contract to legal",
    owner: "Dan",
    ownerInferred: false,
    due: "2026-07-24",
    priority: "high",
    status: "todo",
    at: 259,
    ...overrides,
  };
}

/** Undoes RFC 5545 line folding (CRLF + a single leading space) so an assertion can
 *  compare against the original unfolded content regardless of where folds landed. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("datedTodos", () => {
  it("keeps only todos with a due date, preserving order", () => {
    const todos = [
      todo({ id: "a", due: "2026-07-24" }),
      todo({ id: "b", due: null }),
      todo({ id: "c", due: "2026-07-25" }),
    ];
    expect(datedTodos(todos).map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("buildIcs", () => {
  it("produces one VEVENT per dated todo and skips undated ones", () => {
    const ics = unfold(buildIcs([todo({ id: "a", due: "2026-07-24" }), todo({ id: "b", due: null })]));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:a@syncmind.app");
    expect(ics).not.toContain("UID:b@syncmind.app");
  });

  it("sets DTSTART to the due date and DTEND to the day after (RFC 5545 all-day events are exclusive-ended)", () => {
    const ics = unfold(buildIcs([todo({ due: "2026-07-24" })]));
    expect(ics).toContain("DTSTART;VALUE=DATE:20260724");
    expect(ics).toContain("DTEND;VALUE=DATE:20260725");
  });

  it("rolls DTEND over a month boundary correctly", () => {
    const ics = unfold(buildIcs([todo({ due: "2026-07-31" })]));
    expect(ics).toContain("DTSTART;VALUE=DATE:20260731");
    expect(ics).toContain("DTEND;VALUE=DATE:20260801");
  });

  it("escapes commas and semicolons in the summary", () => {
    const ics = unfold(buildIcs([todo({ title: "A, B; C" })]));
    expect(ics).toContain("SUMMARY:A\\, B\\; C");
  });

  it("escapes backslashes in the summary", () => {
    const ics = unfold(buildIcs([todo({ title: "back\\slash" })]));
    expect(ics).toContain("SUMMARY:back\\\\slash");
  });

  it("does not fold a short summary line", () => {
    const ics = buildIcs([todo({ title: "Short title" })]);
    expect(ics).toContain("SUMMARY:Short title\r\n");
  });

  it("folds a summary line over 75 octets, with each continuation starting with a space", () => {
    const longTitle = "A".repeat(90);
    const folded = buildIcs([todo({ title: longTitle })]);
    expect(folded).toContain("\r\n ");

    const summaryLine = folded.split("SUMMARY:")[1].split("DESCRIPTION")[0];
    const rejoined = summaryLine.replace(/\r\n /g, "");
    expect(rejoined).toBe(`${longTitle}\r\n`);

    const firstSegment = summaryLine.split("\r\n")[0];
    expect(new TextEncoder().encode(`SUMMARY:${firstSegment}`).length).toBeLessThanOrEqual(75);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Send the vendor contract to legal")).toBe("send-the-vendor-contract-to-legal");
  });

  it("falls back to syncmind for an empty result", () => {
    expect(slugify("")).toBe("syncmind");
    expect(slugify("!!!")).toBe("syncmind");
  });

  it("truncates to 60 characters", () => {
    const result = slugify("a".repeat(100));
    expect(result).toHaveLength(60);
    expect(result).toBe("a".repeat(60));
  });
});

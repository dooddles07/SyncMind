import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDuration,
  formatTimecode,
  isOverdue,
  type Todo,
} from "@/lib/types";

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: "t1",
    meetingId: "m1",
    meetingTitle: "Test meeting",
    title: "Do the thing",
    owner: "Maya",
    ownerInferred: false,
    due: null,
    priority: "medium",
    status: "todo",
    at: 0,
    ...overrides,
  };
}

describe("formatTimecode", () => {
  it("formats sub-hour durations as m:ss", () => {
    expect(formatTimecode(214)).toBe("03:34");
  });

  it("formats over-hour durations as h:mm:ss", () => {
    expect(formatTimecode(3789)).toBe("1:03:09");
  });

  it("formats zero", () => {
    expect(formatTimecode(0)).toBe("00:00");
  });

  it("clamps negative values to zero", () => {
    expect(formatTimecode(-50)).toBe("00:00");
  });
});

describe("formatDuration", () => {
  it("formats sub-hour durations in minutes", () => {
    expect(formatDuration(3120)).toBe("52 min");
  });

  it("formats an exact hour without a trailing 0m", () => {
    expect(formatDuration(3600)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("isOverdue", () => {
  const farFuture = new Date("2099-01-01T00:00:00Z");

  it("is true for a past due date that isn't done", () => {
    expect(isOverdue(todo({ due: "2020-01-01", status: "todo" }), farFuture)).toBe(true);
  });

  it("is false once the todo is marked done, regardless of date", () => {
    expect(isOverdue(todo({ due: "2020-01-01", status: "done" }), farFuture)).toBe(false);
  });

  it("is false with no due date", () => {
    expect(isOverdue(todo({ due: null, status: "todo" }), farFuture)).toBe(false);
  });

  it("is false for a due date in the future", () => {
    const soon = new Date("2020-01-01T00:00:00Z");
    expect(isOverdue(todo({ due: "2099-01-01", status: "todo" }), soon)).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats an ISO date as short month + day", () => {
    expect(formatDate("2026-07-26")).toBe("Jul 26");
  });
});

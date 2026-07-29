import { describe, expect, it } from "vitest";
import { buildSrt, buildTxt } from "@/lib/export/transcript";
import type { Segment } from "@/lib/types";

function segment(overrides: Partial<Segment>): Segment {
  return {
    id: "1",
    speakerId: "unknown",
    at: 0,
    text: "Hello there.",
    ...overrides,
  };
}

describe("buildSrt", () => {
  it("uses a segment's real end when present", () => {
    const srt = buildSrt([segment({ at: 0, end: 9.5, text: "Hi." })]);
    expect(srt).toBe("1\n00:00:00,000 --> 00:00:09,500\nHi.\n");
  });

  it("falls back to the next segment's start when end is missing", () => {
    const srt = buildSrt([
      segment({ id: "1", at: 0, text: "First." }),
      segment({ id: "2", at: 12, end: 20, text: "Second." }),
    ]);
    const cues = srt.split("\n\n");
    expect(cues[0]).toBe("1\n00:00:00,000 --> 00:00:12,000\nFirst.");
    expect(cues[1]).toBe("2\n00:00:12,000 --> 00:00:20,000\nSecond.\n");
  });

  it("pads a fixed amount after the last segment's start when end is missing", () => {
    const srt = buildSrt([segment({ at: 100, text: "Last." })]);
    expect(srt).toBe("1\n00:01:40,000 --> 00:01:43,000\nLast.\n");
  });

  it("formats hours correctly for long meetings", () => {
    const srt = buildSrt([segment({ at: 3661, end: 3665, text: "An hour in." })]);
    expect(srt).toBe("1\n01:01:01,000 --> 01:01:05,000\nAn hour in.\n");
  });
});

describe("buildTxt", () => {
  it("includes a speaker prefix when the speaker is known", () => {
    const txt = buildTxt([segment({ at: 65, speakerId: "Dan", text: "Let's ship it." })]);
    expect(txt).toBe("[01:05] Dan: Let's ship it.");
  });

  it("omits the speaker prefix when the speaker is unknown", () => {
    const txt = buildTxt([segment({ at: 5, speakerId: "unknown", text: "No idea who said this." })]);
    expect(txt).toBe("[00:05] No idea who said this.");
  });

  it("joins multiple segments with newlines, one per line", () => {
    const txt = buildTxt([
      segment({ id: "1", at: 0, text: "First." }),
      segment({ id: "2", at: 10, text: "Second." }),
    ]);
    expect(txt).toBe("[00:00] First.\n[00:10] Second.");
  });
});

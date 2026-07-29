import { describe, expect, it } from "vitest";
import { shiftAndDedupe, type WhisperSegment } from "@/server/utils/transcript-stitch";

describe("shiftAndDedupe", () => {
  it("keeps everything for the first chunk, just shifted by chunkStartSec", () => {
    const segments: WhisperSegment[] = [
      { start: 0, end: 4, text: "Alright let's start" },
      { start: 4, end: 9, text: "the vendor contract" },
    ];
    const result = shiftAndDedupe(segments, 0, null);
    expect(result).toEqual([
      { startSec: 0, endSec: 4, text: "Alright let's start" },
      { startSec: 4, endSec: 9, text: "the vendor contract" },
    ]);
  });

  it("shifts a non-first chunk's timestamps by its start offset", () => {
    const segments: WhisperSegment[] = [{ start: 5, end: 8, text: "after the seam" }];
    // chunkStartSec 600, previous chunk ended well before this segment's shifted start
    const result = shiftAndDedupe(segments, 600, 600);
    expect(result).toEqual([{ startSec: 605, endSec: 608, text: "after the seam" }]);
  });

  it("drops a segment entirely inside the already-covered overlap region", () => {
    const segments: WhisperSegment[] = [{ start: 1, end: 2.5, text: "duplicate of the tail" }];
    // shifted: 598-599.5, previous chunk already covers up to 600
    const result = shiftAndDedupe(segments, 597, 600);
    expect(result).toEqual([]);
  });

  it("keeps a segment that starts at or after the previous chunk's end", () => {
    const segments: WhisperSegment[] = [{ start: 5, end: 8, text: "new content" }];
    // shifted: 602-605, previous chunk ended at 600
    const result = shiftAndDedupe(segments, 597, 600);
    expect(result).toEqual([{ startSec: 602, endSec: 605, text: "new content" }]);
  });

  it("keeps a boundary-straddling segment when more than half its duration is past the seam", () => {
    const segments: WhisperSegment[] = [{ start: 2, end: 6, text: "mostly new" }];
    // shifted: 599-603, previous end 600 -> overlap 1s of 4s duration (25%)
    const result = shiftAndDedupe(segments, 597, 600);
    expect(result).toEqual([{ startSec: 599, endSec: 603, text: "mostly new" }]);
  });

  it("drops a boundary-straddling segment when at least half its duration is before the seam", () => {
    const segments: WhisperSegment[] = [{ start: 1, end: 5, text: "mostly repeat" }];
    // shifted: 598-602, previous end 600 -> overlap 2s of 4s duration (exactly 50%,
    // not "more than half" past the seam)
    const result = shiftAndDedupe(segments, 597, 600);
    expect(result).toEqual([]);
  });

  it("assigns nothing when the whole batch predates the seam", () => {
    const segments: WhisperSegment[] = [
      { start: 0, end: 1, text: "a" },
      { start: 1, end: 2, text: "b" },
    ];
    const result = shiftAndDedupe(segments, 597, 600);
    expect(result).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { planChunks } from "@/lib/audio/chunker";

describe("planChunks", () => {
  it("produces a single, unpadded chunk for a recording shorter than the chunk length", () => {
    expect(planChunks(300)).toEqual([{ index: 0, startSec: 0, durationSec: 300 }]);
  });

  it("produces a single chunk exactly at the chunk length boundary", () => {
    expect(planChunks(600)).toEqual([{ index: 0, startSec: 0, durationSec: 600 }]);
  });

  it("gives every non-last chunk the 3s trailing overlap, and clips the last chunk to the real remainder", () => {
    // 10:50 total -> chunk 0 runs 10:03 (overlap included), chunk 1 covers the last 50s only
    expect(planChunks(650)).toEqual([
      { index: 0, startSec: 0, durationSec: 603 },
      { index: 1, startSec: 600, durationSec: 50 },
    ]);
  });

  it("chains overlap across 3+ chunks with correct absolute start offsets", () => {
    // 25:00 total -> 3 chunks
    expect(planChunks(1500)).toEqual([
      { index: 0, startSec: 0, durationSec: 603 },
      { index: 1, startSec: 600, durationSec: 603 },
      { index: 2, startSec: 1200, durationSec: 300 },
    ]);
  });

  it("never pads a non-last chunk past the actual remaining duration, even inside the overlap window", () => {
    // 10:02 total -> chunk 0's "full" overlap window (603s) would overshoot the
    // 602s that actually exist, so it must clip to what's left, not pad to 603
    expect(planChunks(602)).toEqual([
      { index: 0, startSec: 0, durationSec: 602 },
      { index: 1, startSec: 600, durationSec: 2 },
    ]);
  });
});

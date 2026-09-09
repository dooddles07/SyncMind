import { describe, expect, it } from "vitest";
import { locateChunk, type PlayableChunk } from "@/lib/audio/playlist";

const chunks: PlayableChunk[] = [
  { index: 0, startSec: 0, durationSec: 603, url: "a" },
  { index: 1, startSec: 600, durationSec: 603, url: "b" },
  { index: 2, startSec: 1200, durationSec: 300, url: "c" },
];

describe("locateChunk", () => {
  it("maps a position to the chunk holding it, with an offset inside that chunk", () => {
    expect(locateChunk(chunks, 0)).toEqual({ chunk: chunks[0], offsetSec: 0 });
    expect(locateChunk(chunks, 120)).toEqual({ chunk: chunks[0], offsetSec: 120 });
    expect(locateChunk(chunks, 1300)).toEqual({ chunk: chunks[2], offsetSec: 100 });
  });

  it("prefers the later chunk inside the 3s overlap, so playing off the end of one continues in the next", () => {
    // Chunk 0 ends at 603; that same position is 3s into chunk 1.
    expect(locateChunk(chunks, 603)).toEqual({ chunk: chunks[1], offsetSec: 3 });
  });

  it("has nothing to locate in an empty playlist", () => {
    expect(locateChunk([], 10)).toBeNull();
  });
});

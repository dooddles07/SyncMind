import { describe, expect, it } from "vitest";
import { isNearDuplicate, levenshteinDistance } from "@/server/utils/text-similarity";

describe("levenshteinDistance", () => {
  it("is zero for identical strings", () => {
    expect(levenshteinDistance("send the deck", "send the deck")).toBe(0);
  });

  it("counts a single substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("counts insertions", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });

  it("handles an empty string against a non-empty one", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
  });
});

describe("isNearDuplicate", () => {
  it("treats a case/whitespace-only difference as a duplicate", () => {
    expect(isNearDuplicate("Send the Vendor Contract", "  send the vendor contract  ")).toBe(true);
  });

  it("treats a small wording difference within distance 3 as a duplicate", () => {
    expect(isNearDuplicate("Send the vendor contract", "Send the vendor contracts")).toBe(true);
  });

  it("does not treat genuinely different action items as duplicates", () => {
    expect(isNearDuplicate("Send the vendor contract to legal", "Book the offsite venue")).toBe(false);
  });

  it("respects a custom max distance", () => {
    // Textbook case: levenshteinDistance("kitten", "sitting") === 3.
    expect(isNearDuplicate("kitten", "sitting", 2)).toBe(false);
    expect(isNearDuplicate("kitten", "sitting", 3)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  asPlainText,
  gmailComposeUrl,
  isTooLongForCompose,
  mailtoUrl,
  MAX_COMPOSE_URL,
  type Compose,
} from "@/lib/export/gmail";

const compose: Compose = {
  to: ["dan@example.com", "priya@example.com"],
  subject: "Q3 planning — what we agreed",
  body: "Line one\nLine two",
};

describe("gmailComposeUrl", () => {
  it("joins recipients with a comma and URL-encodes the subject and body", () => {
    const url = gmailComposeUrl(compose);
    expect(url).toContain("https://mail.google.com/mail/?");
    expect(url).toContain("to=dan%40example.com%2Cpriya%40example.com");
    expect(url).toContain("su=Q3+planning");
    expect(url).toContain("body=Line+one%0ALine+two");
  });
});

describe("mailtoUrl", () => {
  it("joins recipients with a comma in the mailto path and encodes params", () => {
    const url = mailtoUrl(compose);
    expect(url).toBe(
      "mailto:dan@example.com,priya@example.com?subject=Q3+planning+%E2%80%94+what+we+agreed&body=Line+one%0ALine+two",
    );
  });
});

describe("isTooLongForCompose", () => {
  it("is false for a short message", () => {
    expect(isTooLongForCompose(compose)).toBe(false);
  });

  it("is true once the compose URL exceeds MAX_COMPOSE_URL", () => {
    const huge: Compose = { ...compose, body: "x".repeat(MAX_COMPOSE_URL) };
    expect(isTooLongForCompose(huge)).toBe(true);
  });
});

describe("asPlainText", () => {
  it("formats To/Subject header lines followed by a blank line then the body", () => {
    expect(asPlainText(compose)).toBe(
      "To: dan@example.com, priya@example.com\nSubject: Q3 planning — what we agreed\n\nLine one\nLine two",
    );
  });
});

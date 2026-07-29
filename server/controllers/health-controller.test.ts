import { describe, expect, it } from "vitest";
import { getHealth } from "@/server/controllers/health-controller";

describe("getHealth", () => {
  it("returns an ok status with a parseable timestamp", () => {
    const result = getHealth();
    expect(result.status).toBe("ok");
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it("falls back to 'dev' for the commit outside a Vercel deploy", () => {
    // No VERCEL_GIT_COMMIT_SHA is set in the test environment.
    expect(getHealth().commit).toBe("dev");
  });
});

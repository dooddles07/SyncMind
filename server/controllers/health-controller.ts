import { commitSha } from "@/server/config/env";

// Framework-agnostic on purpose: no next/server import here. Route handlers
// (app/api/**/route.ts) are the only layer that knows about Next.js request/response
// types -- controllers take and return plain data so they're testable without
// mocking a framework.
export function getHealth() {
  return {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    commit: commitSha(),
  };
}

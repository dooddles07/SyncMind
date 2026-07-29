import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors from Server Components, middleware, and route handlers -- a no-op
// wiring today (no app/api/** exists yet) that starts earning its keep the moment P1
// adds real server-side code.
export const onRequestError = Sentry.captureRequestError;

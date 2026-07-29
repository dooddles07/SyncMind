import * as Sentry from "@sentry/nextjs";

// A Sentry DSN isn't a secret (Sentry's own docs confirm it's meant to be embedded
// client-side), so this is the one env var read by all three config files, not split
// into a public/server pair for the same value.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // Error capture only for now, not performance tracing -- keeps clear of Sentry's
  // separate (smaller) free-tier performance quota until there's a real backend to
  // trace.
});

// Navigation breadcrumbs, not performance tracing -- lets an error report show what
// page the user was on right before it happened. Sentry flags this as required at
// build time if it's missing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import { request } from "@playwright/test";

// Runs once per test run, after both webServer entries report healthy.
// Calls the test-only sign-in stub (app/api/test/login) and saves the real
// session cookies it sets, reused by every spec via playwright.config.ts's
// `use.storageState` -- signs in once, not once per test.
export default async function globalSetup() {
  const secret = process.env.E2E_TEST_SECRET;
  if (!secret) {
    throw new Error(
      "E2E_TEST_SECRET is not set. Add it to .env.local to run the E2E suite (see .env.example).",
    );
  }

  const context = await request.newContext({ baseURL: "http://localhost:3000" });
  const res = await context.post("/api/test/login", { headers: { "x-e2e-secret": secret } });
  if (!res.ok()) {
    throw new Error(`Test sign-in failed: ${res.status()} ${await res.text()}`);
  }

  await context.storageState({ path: "tests/e2e/.auth/user.json" });
  await context.dispose();
}

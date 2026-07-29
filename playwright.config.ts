import { defineConfig, devices } from "@playwright/test";

// Loads .env.local into this process (and everything it spawns below, since
// child processes inherit the parent's env by default) -- same zero-dependency
// approach as scripts/eval.ts, just via the JS API instead of --env-file.
// Only present locally; CI sets these directly as real env vars instead, so a
// missing file here is expected there, not an error.
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // no .env.local -- fine in CI
}

const MOCK_GROQ_PORT = 4010;
const MOCK_GROQ_URL = `http://localhost:${MOCK_GROQ_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 150000, // real chunking + transcription + analysis + email in one flow, needs headroom
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    storageState: "tests/e2e/.auth/user.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `npx tsx tests/e2e/mock-groq-server-start.ts ${MOCK_GROQ_PORT}`,
      port: MOCK_GROQ_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, GROQ_BASE_URL: MOCK_GROQ_URL } as Record<string, string>,
    },
  ],
});

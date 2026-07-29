import path from "node:path";
import { expect, test } from "@playwright/test";
import { deleteMeeting } from "@/server/controllers/meeting-controller";
import { createAdminClient } from "@/server/config/supabase-admin";

// Guaranteed regardless of whether the worker process inherited it from the
// config process -- see playwright.config.ts's comment on this same call.
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // no .env.local -- fine in CI
}

const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample.wav");
const ACTION_ITEM_TITLE = "Follow up on the budget proposal";

let meetingId: string | undefined;

test.afterAll(async () => {
  if (!meetingId) return;
  // Reuses the real deleteMeeting controller (storage cleanup + row delete,
  // everything else cascades) instead of hand-rolling per-table deletes.
  await deleteMeeting(createAdminClient(), meetingId);
});

test("full pipeline: upload -> ready -> move a to-do -> share -> public page", async ({ page, browser }) => {
  // 1. Upload the fixture recording.
  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
  await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
  await page.getByRole("button", { name: "Start" }).click();

  await page.waitForURL(/\/meetings\/[0-9a-f-]+$/, { timeout: 60000 });
  meetingId = page.url().split("/meetings/")[1];
  expect(meetingId).toBeTruthy();

  // 2. Poll the real status API (not just the UI) until the pipeline reaches "ready".
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/meetings/${meetingId}/status`);
        const json = await res.json();
        return json.status;
      },
      { timeout: 90000, intervals: [2000] },
    )
    .toBe("ready");

  await page.reload();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();

  // 3. "Edit an action item" -- the only real edit affordance is the /tasks
  // board's status move, not anything on the meeting page (see plan notes).
  await page.goto("/tasks");
  const moveSelect = page.getByLabel(`Move "${ACTION_ITEM_TITLE}" to another column`);
  await expect(moveSelect).toBeVisible({ timeout: 15000 });
  await moveSelect.selectOption({ label: "In progress" });
  await expect(moveSelect).toHaveValue("doing");

  // 4. Create a share link from the meeting page.
  await page.goto(`/meetings/${meetingId}`);
  await page.getByRole("button", { name: "Share a read-only link" }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page.locator('input[readonly]')).toBeVisible({ timeout: 15000 });
  const shareUrl = await page.locator('input[readonly]').inputValue();
  expect(shareUrl).toContain("/share/");

  // 5. Verify the public page renders for real, in a fresh unauthenticated context.
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(shareUrl);
  await expect(publicPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(publicPage.getByText("Read-only")).toBeVisible();
  await expect(publicPage.getByRole("heading", { name: "To-dos" })).toBeVisible();
  await publicContext.close();
});

import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // tests/e2e/*.spec.ts are Playwright specs, not Vitest's -- Vitest's
    // default include pattern would otherwise pick them up too.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});

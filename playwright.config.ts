import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Use the pre-installed Chromium locally (its build may differ from the pinned
// @playwright/test version). In CI the path won't exist, so fall back to the
// browser Playwright installs itself.
const LOCAL_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined;

/**
 * E2E config. Builds are served by `vite preview` at the project base path
 * (/football-simulator-html/). Chromium is pre-installed at /opt/pw-browsers —
 * we never run `playwright install`.
 */
const PORT = 4173;
const BASE = "/football-simulator-html/";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath },
      },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

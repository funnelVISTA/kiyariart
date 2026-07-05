import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "8080";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// In the Lovable sandbox, Chromium is pre-installed at a version-pinned
// path that doesn't match the one Playwright's own downloader expects.
// Callers can point at any Chromium via PLAYWRIGHT_CHROMIUM_EXECUTABLE;
// CI installs its own via `playwright install` and leaves this unset.
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 1800 },
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(CHROMIUM_EXECUTABLE
          ? { launchOptions: { executablePath: CHROMIUM_EXECUTABLE } }
          : {}),
      },
    },
  ],
  // Assumes `bun dev` is already running (default in the sandbox / CI).
  // Set E2E_START_SERVER=1 to have Playwright boot it.
  webServer: process.env.E2E_START_SERVER
    ? {
        command: "bun run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
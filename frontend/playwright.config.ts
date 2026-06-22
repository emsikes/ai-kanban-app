import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "cd ../backend && DATABASE_PATH=data/e2e.db uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      // Override the device's 1280x720 with a roomy desktop viewport so the
      // board + fixed chat panel are not cramped (keeps cards on-screen).
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1200 } },
    },
  ],
});

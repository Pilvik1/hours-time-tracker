import { defineConfig } from "@playwright/test";

const databaseUrl = "sqlite+pysqlite:///../.e2e/time-tracker.sqlite";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../.e2e/playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        "DATABASE_URL='" +
        databaseUrl +
        "' TIME_TRACKER_PASSWORD='integration-test-password' TIME_TRACKER_SESSION_SECRET='integration-test-session-secret-with-more-than-32-characters' TIME_TRACKER_COOKIE_SECURE=false ../.venv/bin/uvicorn time_tracker.main:app --app-dir src --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: false,
    },
    {
      command:
        "API_INTERNAL_URL='http://127.0.0.1:8000' HOST='127.0.0.1' PORT=3000 node .output/server/index.mjs",
      cwd: ".",
      url: "http://127.0.0.1:3000/healthz",
      reuseExistingServer: false,
    },
  ],
});

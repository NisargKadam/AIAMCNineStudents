import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { fixtureBank } from "./tests/exam-fixture";
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1440, height: 1100 },
    trace: "retain-on-failure",
  },
  webServer: {
    env: {
      EXAM_BANK_BASE64: Buffer.from(JSON.stringify(fixtureBank)).toString(
        "base64",
      ),
    },
    command: "npm run start -- --port 3001",
    url: "http://localhost:3001/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

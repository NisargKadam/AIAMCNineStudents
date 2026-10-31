import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";
import { fixtureBank } from "./tests/exam-fixture";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Reads .env so the PostgreSQL integration tests run locally the same way
    // they do in CI, where DATABASE_URL comes from the runner environment.
    env: {
      ...loadEnv("", process.cwd(), ""),
      EXAM_BANK_BASE64: Buffer.from(JSON.stringify(fixtureBank)).toString(
        "base64",
      ),
    },
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});

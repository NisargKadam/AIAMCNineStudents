import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Reads .env so the PostgreSQL integration tests run locally the same way
    // they do in CI, where DATABASE_URL comes from the runner environment.
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});

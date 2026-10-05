import { fileURLToPath, URL } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const testEnv = loadEnv("test", process.cwd(), "");
const rootTestEnv = loadEnv("test", fileURLToPath(new URL("../", import.meta.url)), "");
const testDatabaseUrl =
  testEnv.TEST_DATABASE_URL ??
  testEnv.NEON_TEST_DATABASE_URL ??
  rootTestEnv.TEST_DATABASE_URL ??
  rootTestEnv.NEON_TEST_DATABASE_URL;

if (testDatabaseUrl && process.env.DATABASE_URL === testDatabaseUrl) {
  throw new Error("DATABASE_URL must not point to the TEST_DATABASE_URL database.");
}

if (testDatabaseUrl) {
  process.env.TEST_DATABASE_URL = testDatabaseUrl;
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Next resolves this marker using its react-server condition. Vitest runs
      // server code directly, so use the package's no-op implementation.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    fileParallelism: false,
    maxWorkers: 1,
  },
});

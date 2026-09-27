import { fileURLToPath, URL } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const testEnv = loadEnv("test", process.cwd(), "");

if (testEnv.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = testEnv.TEST_DATABASE_URL;
  process.env.DATABASE_URL = testEnv.TEST_DATABASE_URL;
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

import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    uploads: { access: "private" },
  },
  preview: {
    functions: {
      api: { name: "api", source: "./hello.ts" },
    },
  },
});

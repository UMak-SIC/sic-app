import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    "private-images": { access: "private" },
    "public-images": { access: "public_read" },
  },
  preview: {
    functions: {
      api: { name: "api", source: "./hello.ts" },
    },
  },
});

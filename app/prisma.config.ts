import { defineConfig } from "prisma/config";

// Allows non-connection Prisma commands to run before Neon credentials exist.
// The application client independently requires DATABASE_URL at runtime.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://invalid:invalid@invalid.invalid:5432/invalid?sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

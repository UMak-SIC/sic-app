import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const requiredEnvironment = [
  "DATABASE_URL",
  "ADMIN_NEON_AUTH_USER_ID",
];
const missing = requiredEnvironment.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// The first System Administrator (AC-04.11). Later entries are added in the
// dashboard. Running this again is safe: it links or reports the existing entry.
const neonAuthUserId = process.env.ADMIN_NEON_AUTH_USER_ID;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

try {
  const existing = await prisma.allowlistEntry.findUnique({ where: { neonAuthUserId } });

  if (existing) {
    if (existing.role !== "SYSTEM_ADMIN" || existing.removedAt) {
      throw new Error(
        `Neon Auth user ${neonAuthUserId} is on the allowlist but is not an active System Administrator.`,
      );
    }

    if (email && !existing.normalizedEmail) {
      await prisma.allowlistEntry.update({
        where: { id: existing.id },
        data: { normalizedEmail: email },
      });
      console.log(`Added ${email} to the existing System Administrator ${neonAuthUserId}.`);
    } else {
      console.log(`Neon Auth user ${neonAuthUserId} is already a System Administrator.`);
    }
  } else {
    await prisma.allowlistEntry.create({
      data: { neonAuthUserId, normalizedEmail: email, role: "SYSTEM_ADMIN" },
    });
    console.log(`Configured Neon Auth user ${neonAuthUserId} as a System Administrator.`);
  }
} finally {
  await prisma.$disconnect();
}

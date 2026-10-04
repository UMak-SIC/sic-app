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

try {
  const existingAdmin = await prisma.admin.findFirst();

  if (existingAdmin) {
    if (existingAdmin.neonAuthUserId !== process.env.ADMIN_NEON_AUTH_USER_ID) {
      throw new Error("The configured Neon Auth user ID does not match the existing administrator.");
    }

    console.log(
      `Neon Auth user ${existingAdmin.neonAuthUserId} is already configured as the SIC administrator.`,
    );
  } else {
    await prisma.admin.create({
      data: { neonAuthUserId: process.env.ADMIN_NEON_AUTH_USER_ID },
    });
    console.log(
      `Configured Neon Auth user ${process.env.ADMIN_NEON_AUTH_USER_ID} as the SIC administrator.`,
    );
  }
} finally {
  await prisma.$disconnect();
}

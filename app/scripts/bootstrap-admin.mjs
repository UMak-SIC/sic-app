import { createClerkClient } from "@clerk/backend";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const bootstrapExternalId = "sic-admin-bootstrap-v1";
const requiredEnvironment = [
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
const missing = requiredEnvironment.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

neonConfig.webSocketConstructor = ws;

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

function hasConfiguredEmail(user) {
  return user.emailAddresses.some(
    ({ emailAddress }) => emailAddress.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase(),
  );
}

try {
  const existingAdmin = await prisma.admin.findFirst();

  if (existingAdmin) {
    const user = await clerk.users.getUser(existingAdmin.clerkUserId);

    if (!hasConfiguredEmail(user)) {
      throw new Error("The configured admin email does not match the existing administrator.");
    }

    console.log(`Clerk user ${user.id} is already configured as the SIC administrator.`);
  } else {
    const bootstrapUsers = await clerk.users.getUserList({
      externalId: [bootstrapExternalId],
      limit: 1,
    });
    let user = bootstrapUsers.data[0];

    if (user && !hasConfiguredEmail(user)) {
      throw new Error("The existing bootstrap Clerk user does not match the configured admin email.");
    }

    if (!user) {
      const emailUsers = await clerk.users.getUserList({
        emailAddress: [process.env.ADMIN_EMAIL],
        limit: 1,
      });

      if (emailUsers.data[0]) {
        throw new Error(
          "A Clerk user already has ADMIN_EMAIL; refusing to grant it administrator access.",
        );
      }

      user = await clerk.users.createUser({
        emailAddress: [process.env.ADMIN_EMAIL],
        password: process.env.ADMIN_PASSWORD,
        externalId: bootstrapExternalId,
      });
    }

    await prisma.admin.create({ data: { clerkUserId: user.id } });
    console.log(`Configured Clerk user ${user.id} as the SIC administrator.`);
  }
} finally {
  await prisma.$disconnect();
}

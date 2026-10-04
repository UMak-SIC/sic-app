import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

/** Confirms the soft-delete check left nothing behind. Read-only. */

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

try {
  const [attendees, removed, roster, events] = await Promise.all([
    prisma.attendee.count(),
    prisma.attendee.count({ where: { deletedAt: { not: null } } }),
    prisma.eventRosterEntry.count(),
    prisma.event.count(),
  ]);

  const strays = await prisma.attendee.findMany({
    where: { OR: [{ studentId: { contains: "ZZTMP" } }, { name: { contains: "Temp Soft" } }] },
    select: { id: true, name: true, studentId: true, deletedAt: true },
  });

  console.log(`  attendees in directory : ${attendees}`);
  console.log(`  soft-deleted rows      : ${removed}`);
  console.log(`  roster entries         : ${roster}`);
  console.log(`  events                 : ${events}`);
  console.log(`  leftovers from the test: ${strays.length}`);
  for (const stray of strays) {
    console.log(`    ${stray.studentId} ${stray.name} deletedAt=${stray.deletedAt}`);
  }
} finally {
  await prisma.$disconnect();
}

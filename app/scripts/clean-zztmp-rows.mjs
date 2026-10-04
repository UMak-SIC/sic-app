import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

/** Removes rows left by an interrupted import verification. Scoped to ZZTMP only. */

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

try {
  const strays = await prisma.attendee.findMany({
    where: { OR: [{ studentId: { startsWith: "ZZTMP" } }, { name: { startsWith: "Temp Import" } }] },
    select: { id: true, studentId: true, name: true },
  });

  for (const stray of strays) {
    // Roster entries first: the foreign key restricts, so deleting the attendee
    // before its rows would be refused.
    await prisma.eventRosterEntry.deleteMany({ where: { attendeeId: stray.id } });
  }

  const deleted = await prisma.attendee.deleteMany({
    where: { OR: [{ studentId: { startsWith: "ZZTMP" } }, { name: { startsWith: "Temp Import" } }] },
  });

  console.log(`  found ${strays.length}: ${strays.map((s) => s.studentId).join(", ") || "none"}`);
  console.log(`  removed ${deleted.count}`);
} finally {
  await prisma.$disconnect();
}
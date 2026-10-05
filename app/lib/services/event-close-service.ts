import "server-only";

import type { PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export type CloseExpiredEventsResult = {
  closedEventCount: number;
  absentEntryCount: number;
};

export async function closeExpiredEvents(
  now = new Date(),
  database: PrismaClient = getPrismaClient(),
): Promise<CloseExpiredEventsResult> {
  return database.$transaction(async (tx) => {
    const events = await tx.event.findMany({
      where: { status: "PUBLISHED", endsAt: { lte: now } },
      select: { id: true },
    });
    let closedEventCount = 0;
    let absentEntryCount = 0;

    for (const event of events) {
      const closed = await tx.event.updateMany({
        where: { id: event.id, status: "PUBLISHED", endsAt: { lte: now } },
        data: { status: "CLOSED", closedAt: now },
      });

      if (closed.count !== 1) {
        continue;
      }

      closedEventCount += 1;
      const absent = await tx.eventRosterEntry.updateMany({
        where: { eventId: event.id, status: "PENDING" },
        data: { status: "ABSENT" },
      });
      absentEntryCount += absent.count;
    }

    return { closedEventCount, absentEntryCount };
  });
}

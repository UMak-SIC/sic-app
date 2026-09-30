import "server-only";

import { getPrismaClient } from "@/lib/prisma";

export type RetentionResult = {
  anonymizedAttendees: number;
  cutoff: Date;
  deletedAttendees: number;
  deletedDeliveries: number;
  deletedRosterEntries: number;
};

function fiveYearsBefore(now: Date): Date {
  const year = now.getUTCFullYear() - 5;
  const month = now.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(now.getUTCDate(), lastDayOfMonth),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
}

export async function runRetention(now = new Date()): Promise<RetentionResult> {
  const cutoff = fiveYearsBefore(now);

  return getPrismaClient().$transaction(async (tx) => {
    const deletedDeliveries = await tx.emailDelivery.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    const deletedRosterEntries = await tx.eventRosterEntry.deleteMany({
      where: { event: { endsAt: { lt: cutoff } } },
    });
    const deletedAttendees = await tx.attendee.deleteMany({
      where: { createdAt: { lt: cutoff }, rosterEntries: { none: {} } },
    });
    const retainedAttendees = await tx.attendee.findMany({
      where: { createdAt: { lt: cutoff }, rosterEntries: { some: {} } },
      select: { id: true },
    });

    await Promise.all(
      retainedAttendees.map(({ id }) =>
        tx.attendee.update({
          where: { id },
          data: {
            displayEmail: `deleted-${id}@invalid.local`,
            name: "Deleted attendee",
            normalizedEmail: `deleted-${id}@invalid.local`,
            studentId: `deleted-${id}`,
          },
        }),
      ),
    );

    return {
      anonymizedAttendees: retainedAttendees.length,
      cutoff,
      deletedAttendees: deletedAttendees.count,
      deletedDeliveries: deletedDeliveries.count,
      deletedRosterEntries: deletedRosterEntries.count,
    };
  });
}

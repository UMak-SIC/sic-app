import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export type CheckInResult =
  | { status: "checked_in"; arrivedAt: Date }
  | { status: "duplicate"; arrivedAt: Date }
  | { status: "unavailable" };

export async function checkInRosterEntry({
  eventId,
  rosterEntryId,
  scannedByAdminId,
  arrivedAt = new Date(),
}: {
  eventId: string;
  rosterEntryId: string;
  scannedByAdminId: string;
  arrivedAt?: Date;
}): Promise<CheckInResult> {
  return getPrismaClient().$transaction(async (transaction) => {
    const transition = await transaction.eventRosterEntry.updateMany({
      where: {
        id: rosterEntryId,
        eventId,
        status: RosterEntryStatus.PENDING,
      },
      data: {
        status: RosterEntryStatus.ATTENDED,
        arrivedAt,
        scannedByAdminId,
      },
    });

    if (transition.count === 1) {
      return { status: "checked_in", arrivedAt };
    }

    const rosterEntry = await transaction.eventRosterEntry.findUnique({
      where: { eventId_id: { eventId, id: rosterEntryId } },
      select: { status: true, arrivedAt: true },
    });

    if (rosterEntry?.status === RosterEntryStatus.ATTENDED && rosterEntry.arrivedAt) {
      return { status: "duplicate", arrivedAt: rosterEntry.arrivedAt };
    }

    return { status: "unavailable" };
  });
}

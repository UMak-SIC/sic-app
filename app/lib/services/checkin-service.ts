import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { verifyQrTicket } from "@/lib/security/qr-signer";

export type CheckInResult =
  | { status: "checked_in"; arrivedAt: Date }
  | { status: "duplicate"; arrivedAt: Date }
  | { status: "unavailable" };

export interface CheckInResponse {
  status: "success" | "duplicate" | "invalid" | "unavailable";
  message: string;
  arrivedAt?: Date;
  attendee?: {
    id?: string;
    name: string;
    studentId: string;
    email?: string;
    course?: string;
  };
}

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

export async function recordCheckIn({
  eventId,
  ticketTokenOrCode,
  adminId,
}: {
  eventId: string;
  ticketTokenOrCode: string;
  adminId: string;
}): Promise<CheckInResponse> {
  let targetRosterEntryId: string | null = null;

  const verified = verifyQrTicket(ticketTokenOrCode);
  if (verified.valid && verified.eventId === eventId && verified.rosterEntryId) {
    targetRosterEntryId = verified.rosterEntryId;
  }

  const prisma = getPrismaClient();

  if (!targetRosterEntryId) {
    const found = await prisma.eventRosterEntry.findFirst({
      where: {
        eventId,
        // A removed student is not arriving, so their roster entry does not resolve
        // either by ticket or by student number. The entry itself is kept: it is the
        // record that they were on the list.
        attendee: { deletedAt: null },
        OR: [
          { id: ticketTokenOrCode },
          { attendee: { studentId: ticketTokenOrCode } },
        ],
      },
      select: { id: true },
    });
    if (found) {
      targetRosterEntryId = found.id;
    }
  }

  if (!targetRosterEntryId) {
    return {
      status: "invalid",
      message: "Invalid ticket token or unrecognized student ticket code.",
    };
  }

  const checkInResult = await checkInRosterEntry({
    eventId,
    rosterEntryId: targetRosterEntryId,
    scannedByAdminId: adminId,
  });

  const entry = await prisma.eventRosterEntry.findUnique({
    where: { eventId_id: { eventId, id: targetRosterEntryId } },
    include: { attendee: true },
  });

  const attendeeInfo = entry?.attendee
    ? {
        id: entry.attendee.id,
        name: entry.attendee.name,
        studentId: entry.attendee.studentId,
        email: entry.attendee.displayEmail,
      }
    : undefined;

  if (checkInResult.status === "checked_in") {
    return {
      status: "success",
      message: `Checked in successfully: ${entry?.attendee.name ?? "Attendee"}.`,
      arrivedAt: checkInResult.arrivedAt,
      attendee: attendeeInfo,
    };
  }

  if (checkInResult.status === "duplicate") {
    return {
      status: "duplicate",
      message: `Already checked in: ${entry?.attendee.name ?? "Attendee"}.`,
      arrivedAt: checkInResult.arrivedAt,
      attendee: attendeeInfo,
    };
  }

  return {
    status: "unavailable",
    message: "Roster entry is unavailable or not registered for this event.",
  };
}

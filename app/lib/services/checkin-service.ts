import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { type QrTicketRejection, verifyQrTicket } from "@/lib/security/qr-signer";

export type CheckInResult =
  | { status: "checked_in"; arrivedAt: Date; isLate?: boolean }
  | { status: "duplicate"; arrivedAt: Date }
  | { status: "unavailable" };

export interface CheckInResponse {
  status: "success" | "duplicate" | "invalid" | "unavailable";
  message: string;
  reason?: QrTicketRejection;
  arrivedAt?: Date | string;
  isLate?: boolean;
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
    const event = transaction.event
      ? await transaction.event.findUnique({
          where: { id: eventId },
          select: { startsAt: true },
        })
      : null;

    const isLate = event?.startsAt
      ? arrivedAt.getTime() > new Date(event.startsAt).getTime() + 15 * 60 * 1000
      : false;

    const nextStatus = isLate ? RosterEntryStatus.LATE : RosterEntryStatus.ATTENDED;

    const transition = await transaction.eventRosterEntry.updateMany({
      where: {
        id: rosterEntryId,
        eventId,
        status: RosterEntryStatus.PENDING,
      },
      data: {
        status: nextStatus,
        arrivedAt,
        scannedByAdminId,
      },
    });

    if (transition.count === 1) {
      return { status: "checked_in", arrivedAt, isLate };
    }

    const rosterEntry = await transaction.eventRosterEntry.findUnique({
      where: { eventId_id: { eventId, id: rosterEntryId } },
      select: { status: true, arrivedAt: true },
    });

    if (
      (rosterEntry?.status === RosterEntryStatus.ATTENDED ||
        rosterEntry?.status === RosterEntryStatus.LATE) &&
      rosterEntry.arrivedAt
    ) {
      return { status: "duplicate", arrivedAt: rosterEntry.arrivedAt };
    }

    return { status: "unavailable" };
  });
}

export type AttendanceRecord = { status: RosterEntryStatus; arrivedAt: Date | null };

export async function updateAttendanceRecord({
  eventId,
  rosterEntryId,
  status,
  arrivedAt,
  updatedByAdminId,
}: {
  eventId: string;
  rosterEntryId: string;
  status: RosterEntryStatus;
  arrivedAt?: Date | null;
  updatedByAdminId: string;
}): Promise<AttendanceRecord | null> {
  const prisma = getPrismaClient();

  const existing = await prisma.eventRosterEntry.findUnique({
    where: { eventId_id: { eventId, id: rosterEntryId } },
    select: { status: true, arrivedAt: true },
  });

  if (!existing) return null;

  // Arrival time only makes sense for someone who actually attended. Keep an
  // already recorded arrival when re-marking attended/late, default to now when the
  // person is newly marked attended/late, and clear it otherwise.
  const isPresent = status === "ATTENDED" || status === "LATE";
  const nextArrival =
    isPresent
      ? arrivedAt !== undefined && arrivedAt !== null
        ? arrivedAt
        : (existing.arrivedAt ?? new Date())
      : null;

  // The event_roster_entries check constraint requires attended rows to carry
  // an arrival time and a recorded admin, and non-attended rows to carry
  // neither. Only stamp the editor when marking attendance (attended or late).
  const result = await prisma.eventRosterEntry.updateMany({
    where: { id: rosterEntryId, eventId },
    data: {
      status,
      arrivedAt: nextArrival,
      scannedByAdminId: isPresent ? updatedByAdminId : null,
    },
  });

  // The record disappeared between the read and the write — treat it as
  // missing rather than reporting a save that never happened.
  if (result.count === 0) return null;

  return { status, arrivedAt: nextArrival };
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

  const verified = verifyQrTicket(ticketTokenOrCode, { expectedEventId: eventId });
  if (verified.valid && verified.eventId === eventId && verified.rosterEntryId) {
    targetRosterEntryId = verified.rosterEntryId;
  } else if (!verified.valid && verified.reason !== "malformed") {
    return {
      status: "invalid",
      reason: verified.reason,
      message: verified.message,
    };
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
    } else {
      return {
        status: "invalid",
        reason: verified.valid ? "malformed" : verified.reason,
        message: verified.valid ? "This is not a valid QR ticket." : verified.message,
      };
    }
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
    const statusText = checkInResult.isLate ? "Checked in (Late)" : "Checked in successfully";
    return {
      status: "success",
      message: `${statusText}: ${entry?.attendee.name ?? "Attendee"}.`,
      arrivedAt: checkInResult.arrivedAt,
      isLate: checkInResult.isLate,
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

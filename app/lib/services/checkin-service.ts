import "server-only";

import { RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { type QrTicketRejection, verifyQrTicket } from "@/lib/security/qr-signer";

export type CheckInResult =
  | { status: "checked_in"; arrivedAt: Date }
  | { status: "duplicate"; arrivedAt: Date }
  | { status: "unavailable" };

export interface CheckInResponse {
  status: "success" | "duplicate" | "invalid" | "unavailable";
  message: string;
  reason?: QrTicketRejection;
  arrivedAt?: Date | string;
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
    select: { status: true, arrivedAt: true, scannedByAdminId: true },
  });

  if (!existing) return null;

  // Arrival time only makes sense for someone who actually attended. Keep an
  // already recorded arrival when re-marking attended, default to now when the
  // person is newly marked attended, and clear it otherwise.
  const nextArrival =
    status === "ATTENDED"
      ? arrivedAt !== undefined && arrivedAt !== null
        ? arrivedAt
        : (existing.arrivedAt ?? new Date())
      : null;

  // The event_roster_entries check constraint requires attended rows to carry
  // an arrival time and a recorded admin, and non-attended rows to carry
  // neither. Keep the original scanner when correcting an attended record, and
  // only stamp the editor when someone is newly marked attended.
  const nextScanner =
    status === "ATTENDED"
      ? (existing.status === "ATTENDED" ? existing.scannedByAdminId : null) ?? updatedByAdminId
      : null;

  const result = await prisma.eventRosterEntry.updateMany({
    where: { id: rosterEntryId, eventId },
    data: { status, arrivedAt: nextArrival, scannedByAdminId: nextScanner },
  });

  // The record disappeared between the read and the write — treat it as
  // missing rather than reporting a save that never happened.
  if (result.count === 0) return null;

  // There is no audit table yet, so log the previous values; clearing a record
  // otherwise loses the original scan time and scanner for good.
  console.info("[attendance] Admin edited an attendance record.", {
    eventId,
    rosterEntryId,
    editedByAdminId: updatedByAdminId,
    previous: { status: existing.status, arrivedAt: existing.arrivedAt, scannedByAdminId: existing.scannedByAdminId },
    next: { status, arrivedAt: nextArrival, scannedByAdminId: nextScanner },
  });

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

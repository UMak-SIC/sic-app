import "server-only";

import { EventStatus, RosterEntryStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

/**
 * Adding people to an event's roster.
 *
 * This is the only way a roster entry comes into existence. The directory could
 * read rosters, check-in could mark them attended, and the close job could mark
 * them absent, but nothing could create one — so an event had no way to have
 * attendees at all, which in turn meant no campaign recipients and nothing to
 * check in against.
 */

export class RosterError extends Error {}

/** Bounds one request's insert. Well above any realistic event roster. */
export const MAX_ROSTER_BATCH = 1000;

export type AddToRosterResult = {
  added: number;
  /** Already on this event's roster, so the request was a no-op for them. */
  alreadyOnRoster: number;
  /** Student numbers that match nobody in the registry. */
  unknownCount: number;
  unknownStudentIds: string[];
};

/**
 * Adds attendees to an event, as `PENDING`.
 *
 * Pending is the only correct starting state: nobody has arrived yet, and the
 * check-in flow is what moves someone to `ATTENDED`. The table's check
 * constraint enforces that an attended entry carries an arrival time and the
 * administrator who scanned it, and a non-attended one carries neither.
 *
 * Someone already on the roster is counted and skipped rather than treated as an
 * error, so re-running a partially-applied batch is safe and reports what it
 * actually did.
 */
export async function addAttendeesToEvent({
  eventId,
  attendeeIds,
}: {
  eventId: string;
  attendeeIds: string[];
}): Promise<AddToRosterResult> {
  if (attendeeIds.length === 0) {
    throw new RosterError("Choose at least one student to add.");
  }

  if (attendeeIds.length > MAX_ROSTER_BATCH) {
    throw new RosterError(`Add at most ${MAX_ROSTER_BATCH} students at a time.`);
  }

  const uniqueIds = [...new Set(attendeeIds)];

  return getPrismaClient().$transaction(async (transaction) => {
    const event = await transaction.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new RosterError("That event no longer exists.");
    }

    if (event.status === EventStatus.CLOSED) {
      // A closed event has already had its pending entries marked absent, so
      // adding someone now would produce a person who is on a finished roster and
      // never arrived. Better to say so than to record it.
      throw new RosterError("That event has closed, so its roster can no longer be changed.");
    }

    const known = await transaction.attendee.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    const knownIds = known.map((row) => row.id);
    const unknownIds = uniqueIds.filter((id) => !knownIds.includes(id));

    if (knownIds.length === 0) {
      return {
        added: 0,
        alreadyOnRoster: 0,
        unknownCount: unknownIds.length,
        unknownStudentIds: unknownIds,
      };
    }

    // skipDuplicates rather than reading first and filtering: the unique index on
    // (event_id, attendee_id) is the authority, so two concurrent adds of the same
    // person cannot both succeed the way a read-then-write would allow.
    const created = await transaction.eventRosterEntry.createMany({
      data: knownIds.map((attendeeId) => ({
        eventId,
        attendeeId,
        status: RosterEntryStatus.PENDING,
      })),
      skipDuplicates: true,
    });

    return {
      added: created.count,
      alreadyOnRoster: knownIds.length - created.count,
      unknownCount: unknownIds.length,
      unknownStudentIds: unknownIds,
    };
  });
}

/** True when the value is a UUID, for route-level validation. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

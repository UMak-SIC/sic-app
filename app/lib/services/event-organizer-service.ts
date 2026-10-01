import "server-only";

import { EventStatus } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export class EventOrganizerError extends Error {}

export async function listEventOrganizerIds(eventId: string): Promise<string[]> {
  const organizers = await getPrismaClient().eventOrganizer.findMany({
    where: { eventId },
    select: { attendeeId: true },
  });

  return organizers.map((organizer) => organizer.attendeeId);
}

/** Replaces the organizer list so unchecking a person is saved, too. */
export async function setEventOrganizers(eventId: string, attendeeIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(attendeeIds)];

  await getPrismaClient().$transaction(async (transaction) => {
    const event = await transaction.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });

    if (!event) throw new EventOrganizerError("That event no longer exists.");
    if (event.status === EventStatus.CLOSED) {
      throw new EventOrganizerError("That event has closed, so its organizer list can no longer be changed.");
    }

    const attendees = await transaction.attendee.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true },
    });

    if (attendees.length !== uniqueIds.length) {
      throw new EventOrganizerError("One or more selected people are no longer in the attendee directory.");
    }

    await transaction.eventOrganizer.deleteMany({ where: { eventId } });
    if (uniqueIds.length > 0) {
      await transaction.eventOrganizer.createMany({
        data: uniqueIds.map((attendeeId) => ({ eventId, attendeeId })),
      });
    }
  });
}

type Person = { id: string; name: string; studentId: string; email: string; course: string | null; program: string | null };

export async function getEventPeople(eventId: string): Promise<{ attendees: Person[]; organizers: Person[] } | null> {
  const event = await getPrismaClient().event.findUnique({
    where: { id: eventId },
    select: {
      rosterEntries: { orderBy: { attendee: { name: "asc" } }, select: { attendee: { select: { id: true, name: true, studentId: true, displayEmail: true, course: true, program: true } } } },
      organizers: { orderBy: { attendee: { name: "asc" } }, select: { attendee: { select: { id: true, name: true, studentId: true, displayEmail: true, course: true, program: true } } } },
    },
  });
  if (!event) return null;
  const person = (attendee: { id: string; name: string; studentId: string; displayEmail: string; course: string | null; program: string | null }): Person => ({ ...attendee, email: attendee.displayEmail });
  return { attendees: event.rosterEntries.map((entry) => person(entry.attendee)), organizers: event.organizers.map((entry) => person(entry.attendee)) };
}

/** Saves both lists in one transaction so an error cannot leave a half-saved modal. */
export async function saveEventPeople(eventId: string, attendeeIds: string[], organizerIds: string[]) {
  const rosterIds = [...new Set(attendeeIds)];
  const organizerIdsUnique = [...new Set(organizerIds)];
  const allIds = [...new Set([...rosterIds, ...organizerIdsUnique])];

  return getPrismaClient().$transaction(async (transaction) => {
    const event = await transaction.event.findUnique({ where: { id: eventId }, select: { status: true } });
    if (!event) throw new EventOrganizerError("That event no longer exists.");
    if (event.status === EventStatus.CLOSED) throw new EventOrganizerError("That event has closed, so its people list can no longer be changed.");
    const known = await transaction.attendee.count({ where: { id: { in: allIds }, deletedAt: null } });
    if (known !== allIds.length) throw new EventOrganizerError("One or more selected people are no longer in the attendee directory.");

    const roster = await transaction.eventRosterEntry.createMany({
      data: rosterIds.map((attendeeId) => ({ eventId, attendeeId })),
      skipDuplicates: true,
    });
    await transaction.eventOrganizer.deleteMany({ where: { eventId } });
    if (organizerIdsUnique.length) {
      await transaction.eventOrganizer.createMany({ data: organizerIdsUnique.map((attendeeId) => ({ eventId, attendeeId })) });
    }
    return { addedAttendees: roster.count };
  });
}

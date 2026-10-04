import "server-only";

import type { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation/attendee-validation";

import type { ConflictPreview } from "./ingestion/conflict-service";
import type { IngestionRecord } from "./ingestion/parser";

/**
 * Single-record writes to the registry.
 *
 * Removal is a soft delete. `attendees.id` is what every roster entry and delivery
 * points at, so erasing a row would either orphan that history or be refused by the
 * foreign key. Marking the row instead keeps the history resolvable, and lets a
 * student who is re-added keep the attendance they already had.
 */
/**
 * Why a write was refused.
 *
 * `not_found` covers a student who is not in the directory, including one who was
 * already removed. `conflict` covers an identity that belongs to somebody else, which
 * is a different situation for the caller: the record is there, the change is not
 * allowed. Collapsing them would answer "no such student" to someone whose student
 * number is simply taken.
 */
export type AttendeeWriteErrorKind = "not_found" | "conflict";

export class AttendeeWriteError extends Error {
  constructor(
    message: string,
    readonly kind: AttendeeWriteErrorKind = "conflict"
  ) {
    super(message);
    this.name = "AttendeeWriteError";
  }
}

/** The details an administrator can set. Nullable fields may be left unset. */
export type AttendeeDetails = {
  name: string;
  studentId: string;
  email: string;
  course: string | null;
  program: string | null;
  section: string | null;
};

/** A partial edit. Omitted fields are left alone; an explicit null clears one. */
export type AttendeeChanges = Partial<Omit<AttendeeDetails, "email">> & {
  email?: string;
};

export type CreateAttendeeResult = {
  id: string;
  /**
   * True when this brought back a student who had been removed, rather than making
   * a new one. The caller says so, because "added" and "restored" are different
   * things to the person who did it and the screen should not blur them.
   */
  restored: boolean;
};

function toRecord(details: AttendeeDetails) {
  return {
    name: details.name,
    studentId: details.studentId,
    displayEmail: details.email,
    normalizedEmail: normalizeEmail(details.email),
    course: details.course,
    program: details.program,
    section: details.section,
  };
}

/**
 * Adds a student, or brings back one who was removed.
 *
 * `normalized_email` and `student_id` are unique across the whole table, removed
 * rows included. Without the restore path, re-adding a student who had been removed
 * would fail on that constraint and the operator would be told a student number is
 * taken by someone who is not in their list. Matching on the unique values instead
 * of creating a second row is also what the import already does, so the two agree on
 * who a person is.
 */
export async function createAttendee(details: AttendeeDetails): Promise<CreateAttendeeResult> {
  const record = toRecord(details);

  // Both unique values are looked up together because either one can be the collision,
  // and they can belong to different rows.
  const matches = await getPrismaClient().attendee.findMany({
    where: {
      OR: [{ normalizedEmail: record.normalizedEmail }, { studentId: record.studentId }],
    },
    select: { id: true, deletedAt: true },
  });

  const active = matches.filter((match) => match.deletedAt === null);

  if (active.length > 0) {
    throw new AttendeeWriteError(
      "A student with that email address or student number is already in the directory.",
    );
  }

  if (matches.length > 1) {
    // Two removed records each hold one of the two values, so there is no single row
    // this could be. Guessing would attach the attendance history to the wrong person.
    throw new AttendeeWriteError(
      "That email address and student number belong to two different removed students. Restore one of them first.",
    );
  }

  if (matches.length === 1) {
    const restored = await getPrismaClient().attendee.update({
      where: { id: matches[0].id },
      data: { ...record, deletedAt: null },
      select: { id: true },
    });

    return { id: restored.id, restored: true };
  }

  const created = await getPrismaClient().attendee.create({
    data: record,
    select: { id: true },
  });

  return { id: created.id, restored: false };
}

/**
 * Edits a student who is in the directory.
 *
 * Each unique value is checked against the other students before writing, so a
 * change cannot quietly take an identity that belongs to someone else. The database
 * constraint would catch it too, but as an error the operator cannot act on.
 */
export async function updateAttendee({
  id,
  changes,
}: {
  id: string;
  changes: AttendeeChanges;
}): Promise<{ id: string }> {
  const existing = await getPrismaClient().attendee.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!existing) {
    throw new AttendeeWriteError("That student is no longer in the directory.", "not_found");
  }

  if (existing.deletedAt !== null) {
    throw new AttendeeWriteError(
      "That student has been removed from the directory. Add them again to bring them back.",
      "not_found",
    );
  }

  const data: Prisma.AttendeeUpdateInput = {};

  if (changes.name !== undefined) data.name = changes.name;
  if (changes.studentId !== undefined) data.studentId = changes.studentId;
  if (changes.course !== undefined) data.course = changes.course;
  if (changes.program !== undefined) data.program = changes.program;
  if (changes.section !== undefined) data.section = changes.section;

  if (changes.email !== undefined) {
    data.displayEmail = changes.email;
    data.normalizedEmail = normalizeEmail(changes.email);
  }

  if (Object.keys(data).length === 0) {
    return { id };
  }

  const claimed: { normalizedEmail?: string; studentId?: string } = {};

  if (data.normalizedEmail !== undefined) claimed.normalizedEmail = data.normalizedEmail as string;
  if (data.studentId !== undefined) claimed.studentId = data.studentId as string;

  if (claimed.normalizedEmail !== undefined || claimed.studentId !== undefined) {
    const taken = await getPrismaClient().attendee.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        OR: [
          ...(claimed.normalizedEmail !== undefined
            ? [{ normalizedEmail: claimed.normalizedEmail }]
            : []),
          ...(claimed.studentId !== undefined ? [{ studentId: claimed.studentId }] : []),
        ],
      },
      select: { id: true },
    });

    if (taken) {
      throw new AttendeeWriteError(
        "Another student already uses that email address or student number.",
      );
    }
  }

  return getPrismaClient().attendee.update({
    where: { id },
    data,
    select: { id: true },
  });
}

/**
 * Removes a student from the directory.
 *
 * Roster entries and delivery history are left in place: they are the record of what
 * happened, and the row they point at has to keep existing for them to mean anything.
 * A student who is added again picks the same row back up.
 */
export async function softDeleteAttendee({ id }: { id: string }): Promise<{ id: string }> {  const now = new Date();

  // Conditional on still being present, so removing the same student twice reports
  // the same thing rather than moving a timestamp nobody can see.
  const removed = await getPrismaClient().attendee.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: now },
  });

  if (removed.count === 1) {
    return { id };
  }

  const existing = await getPrismaClient().attendee.findUnique({
    where: { id },
    select: { deletedAt: true },
  });

  if (!existing) {
    throw new AttendeeWriteError("That student is no longer in the directory.", "not_found");
  }

  throw new AttendeeWriteError(
    "That student has already been removed from the directory.",
    "not_found",
  );
}

/** Bounds one request's batch. Well above any page of the directory. */
export const MAX_REMOVE_BATCH = 500;

export type RemoveAttendeesResult = {
  removed: number;
  /** Already removed, so the request was a no-op for them. */
  alreadyRemoved: number;
  /** Ids that match nobody in the registry. */
  unknownCount: number;
  unknownIds: string[];
};

/**
 * Removes several students from the directory at once.
 *
 * One statement rather than a loop over `softDeleteAttendee`. Removing fifty students
 * in fifty requests means fifty chances to fail part way, and a bulk removal that
 * quietly did half of what was asked is worse than one that did none: the operator has
 * no way to tell which half. A single conditional `updateMany` either marks them all
 * or marks none.
 *
 * Rows that are already removed, or that match nobody, are counted rather than
 * treated as a failure, so re-running a partly applied selection is safe and reports
 * what it actually did.
 */
export async function removeAttendees({
  ids,
}: {
  ids: string[];
}): Promise<RemoveAttendeesResult> {
  if (ids.length === 0) {
    throw new AttendeeWriteError("Choose at least one student to remove.");
  }

  if (ids.length > MAX_REMOVE_BATCH) {
    throw new AttendeeWriteError(`Remove at most ${MAX_REMOVE_BATCH} students at a time.`);
  }

  const uniqueIds = [...new Set(ids)];
  const now = new Date();

  return getPrismaClient().$transaction(async (transaction) => {
    const rows = await transaction.attendee.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, deletedAt: true },
    });

    const found = new Map(rows.map((row) => [row.id, row]));
    const removable = rows.filter((row) => row.deletedAt === null).map((row) => row.id);
    const alreadyRemoved = rows.length - removable.length;
    const unknownIds = uniqueIds.filter((id) => !found.has(id));

    if (removable.length > 0) {
      await transaction.attendee.updateMany({
        where: { id: { in: removable }, deletedAt: null },
        data: { deletedAt: now },
      });
    }

    return {
      removed: removable.length,
      alreadyRemoved,
      unknownCount: unknownIds.length,
      unknownIds,
    };
  });
}

export type UnappliedReason =
  /** The row was a conflict in the preview and must be resolved by an administrator. */
  | "conflict"
  /**
   * `attendees.student_id` is NOT NULL and unique, so a row without one cannot
   * become an attendee. Typical for a pasted address-only list.
   */
  | "missing_student_id";

export type UnappliedRow = {
  record: IngestionRecord;
  reason: UnappliedReason;
  message: string;
};

export type ApplyAttendeeImportResult = {
  createdIds: string[];
  updatedIds: string[];
  unapplied: UnappliedRow[];
};

/**
 * Applies an approved import in a single transaction.
 *
 * `attendees.id` is the target of `event_roster_entries.attendee_id`, so an
 * overwrite must be an in-place `update` keyed by the existing UUID. Replacing a
 * record would orphan every roster entry and attendance row that references it.
 */
export async function applyAttendeeImport(
  preview: ConflictPreview,
): Promise<ApplyAttendeeImportResult> {
  const createdIds: string[] = [];
  const updatedIds: string[] = [];
  const unapplied: UnappliedRow[] = preview.conflicts.map((conflict) => ({
    record: conflict.record,
    reason: "conflict",
    message: conflict.message,
  }));

  return getPrismaClient().$transaction(async (transaction) => {
    for (const update of preview.updates) {
      if (update.changes.length === 0 && !update.isDeleted) {
        // Already matches the import. Skip the write so `updated_at` does not
        // move and the record is not needlessly written.
        updatedIds.push(update.attendeeId);
        continue;
      }

      const data: Prisma.AttendeeUpdateInput = {};

      if (update.isDeleted) {
        // The row matched a student who was removed from the directory, so importing
        // them brings them back. Kept separate from the field changes because it is
        // true even when the row agrees with the stored details in every respect.
        data.deletedAt = null;
      }

      for (const change of update.changes) {
        if (change.proposed === null) {
          continue;
        }

        if (change.field === "name") {
          data.name = change.proposed;
        }

        if (change.field === "studentId") {
          data.studentId = change.proposed;
        }

        if (change.field === "displayEmail") {
          // The two email columns must stay consistent: `normalizedEmail` is the
          // unique identity and is derived, never supplied independently.
          data.displayEmail = change.proposed;
          data.normalizedEmail = normalizeEmail(change.proposed);
        }

        if (change.field === "course") {
          data.course = change.proposed;
        }

        if (change.field === "program") {
          data.program = change.proposed;
        }

        if (change.field === "section") {
          data.section = change.proposed;
        }
      }

      // Updating by the existing UUID is what preserves roster-entry references.
      await transaction.attendee.update({
        where: { id: update.attendeeId },
        data,
        select: { id: true },
      });

      updatedIds.push(update.attendeeId);
    }

    for (const record of preview.newAttendees) {
      if (!record.studentId) {
        unapplied.push({
          record,
          reason: "missing_student_id",
          message: `Row ${record.row} (${record.displayEmail}) has no student ID, which attendees require. Add the student ID and import again.`,
        });
        continue;
      }

      const created = await transaction.attendee.create({
        data: {
          name: record.name ?? record.displayEmail,
          studentId: record.studentId,
          normalizedEmail: record.normalizedEmail,
          displayEmail: record.displayEmail,
          course: record.course,
          program: record.program,
          section: record.section,
        },
        select: { id: true },
      });

      createdIds.push(created.id);
    }

    return { createdIds, updatedIds, unapplied };
  });
}

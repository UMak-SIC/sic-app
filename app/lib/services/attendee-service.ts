import "server-only";

import type { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation/attendee-validation";

import type { ConflictPreview } from "./ingestion/conflict-service";
import type { IngestionRecord } from "./ingestion/parser";

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
      if (update.changes.length === 0) {
        // Already matches the import. Skip the write so `updated_at` does not
        // move and the record is not needlessly written.
        updatedIds.push(update.attendeeId);
        continue;
      }

      const data: Prisma.AttendeeUpdateInput = {};

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

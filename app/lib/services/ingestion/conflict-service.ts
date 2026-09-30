import "server-only";

import { getPrismaClient } from "@/lib/prisma";

import type { IngestionRecord } from "./parser";

export type AttendeeField =
  | "name"
  | "displayEmail"
  | "studentId"
  | "course"
  | "program"
  | "section";

export type AttendeeFieldChange = {
  field: AttendeeField;
  current: string | null;
  proposed: string | null;
};

export type AttendeeUpdatePreview = {
  record: IngestionRecord;
  attendeeId: string;
  matchedBy: "studentId" | "email" | "both";
  /** Only the attributes that would actually change. */
  changes: AttendeeFieldChange[];
};

export type AttendeeConflictReason =
  /** Two imported rows resolve to the same attendee, or collide on a unique value. */
  | "duplicate_in_import"
  /** The row's student ID and email belong to two different existing attendees. */
  | "matches_multiple_attendees";

export type AttendeeConflict = {
  record: IngestionRecord;
  reason: AttendeeConflictReason;
  message: string;
  /**
   * The existing attendee this row collides with, when there is exactly one.
   *
   * The conflict review renders a side-by-side of the stored record against the
   * incoming row, which needs both sides. Without this the left column had nothing
   * to show, because the message alone does not say what is currently on file.
   *
   * Null when there is no single existing record to compare against: either the
   * collision is between two rows of the same import, or the row matches two
   * different people.
   */
  existing: ExistingAttendee | null;
  /**
   * Both existing attendees, only when the row's student ID and email point at
   * two different people. Resolving that needs seeing them, and the message alone
   * does not tell an operator which two.
   */
  candidates: ExistingAttendee[];
};

/**
 * Read-only staging result for one import. Nothing here is written; TSK-0504
 * applies the approved result in a single transaction.
 */
export type ConflictPreview = {
  newAttendees: IngestionRecord[];
  updates: AttendeeUpdatePreview[];
  conflicts: AttendeeConflict[];
};

export type ExistingAttendee = {
  id: string;
  name: string;
  studentId: string;
  normalizedEmail: string;
  displayEmail: string;
  course: string | null;
  program: string | null;
  section: string | null;
};

function describe(record: IngestionRecord): string {
  return `row ${record.row} (${record.displayEmail})`;
}

function diffAgainst(
  record: IngestionRecord,
  existing: ExistingAttendee,
): AttendeeFieldChange[] {
  const changes: AttendeeFieldChange[] = [];

  if (record.name !== null && record.name !== existing.name) {
    changes.push({ field: "name", current: existing.name, proposed: record.name });
  }

  if (record.displayEmail !== existing.displayEmail) {
    changes.push({
      field: "displayEmail",
      current: existing.displayEmail,
      proposed: record.displayEmail,
    });
  }

  if (record.studentId !== null && record.studentId !== existing.studentId) {
    changes.push({
      field: "studentId",
      current: existing.studentId,
      proposed: record.studentId,
    });
  }

  // Course and program are only diffed when the import actually carried them.
  // A CSV with no course column must not report a change for every existing
  // attendee who happens to have one, which would offer to blank the field.
  if (record.course !== null && record.course !== existing.course) {
    changes.push({ field: "course", current: existing.course, proposed: record.course });
  }

  if (record.program !== null && record.program !== existing.program) {
    changes.push({ field: "program", current: existing.program, proposed: record.program });
  }

  if (record.section !== null && record.section !== existing.section) {
    changes.push({ field: "section", current: existing.section, proposed: record.section });
  }

  return changes;
}

/**
 * Matches imported rows against existing attendees on student ID or normalized
 * email, per DMA-02, and separates the rows that are safe to apply from the ones
 * an administrator has to resolve.
 *
 * Performs no writes.
 */
export async function previewAttendeeConflicts(
  records: IngestionRecord[],
): Promise<ConflictPreview> {
  const newAttendees: IngestionRecord[] = [];
  const updates: AttendeeUpdatePreview[] = [];
  const conflicts: AttendeeConflict[] = [];

  if (records.length === 0) {
    return { newAttendees, updates, conflicts };
  }

  const studentIds = [
    ...new Set(
      records
        .map((record) => record.studentId)
        .filter((value): value is string => value !== null),
    ),
  ];
  const emails = [
    ...new Set(records.map((record) => record.normalizedEmail)),
  ];

  const existing = (await getPrismaClient().attendee.findMany({
    where: { OR: [{ studentId: { in: studentIds } }, { normalizedEmail: { in: emails } }] },
    select: {
      id: true,
      name: true,
      studentId: true,
      normalizedEmail: true,
      displayEmail: true,
      course: true,
      program: true,
      section: true,
    },
  })) as ExistingAttendee[];

  const byStudentId = new Map(existing.map((row) => [row.studentId, row]));
  const byEmail = new Map(existing.map((row) => [row.normalizedEmail, row]));

  // Tracks which attendees and unique values earlier rows in this same import
  // already claimed, so a collision inside one file is reported rather than
  // surfacing later as a database constraint violation.
  const claimedAttendees = new Set<string>();
  const claimedStudentIds = new Set<string>();
  const claimedEmails = new Set<string>();

  for (const record of records) {
    const byId = record.studentId ? byStudentId.get(record.studentId) : undefined;
    const byAddress = byEmail.get(record.normalizedEmail);

    // The row's student ID and email point at two different people. Applying it
    // would rewrite one attendee and collide with the other, so never guess.
    if (byId && byAddress && byId.id !== byAddress.id) {
      conflicts.push({
        record,
        reason: "matches_multiple_attendees",
        message: `Student ID ${record.studentId} and email ${record.displayEmail} belong to different existing attendees. Resolve this row manually.`,
        // Neither one is "the" existing record, so the side-by-side has no left
        // column here. Both are given instead, because the operator has to see
        // them to decide which the row was meant to be.
        existing: null,
        candidates: [byId, byAddress],
      });
      continue;
    }

    const matched = byId ?? byAddress;

    if (matched) {
      if (claimedAttendees.has(matched.id)) {
        conflicts.push({
          record,
          reason: "duplicate_in_import",
          message: `${describe(record)} matches attendee ${matched.displayEmail} more than once in this import. Keep one row.`,
          // The stored record is the one both rows are fighting over, so the
          // review can show what is actually on file.
          existing: matched,
          candidates: [],
        });
        continue;
      }

      claimedAttendees.add(matched.id);
      claimedStudentIds.add(matched.studentId);
      claimedEmails.add(matched.normalizedEmail);

      updates.push({
        record,
        attendeeId: matched.id,
        matchedBy: byId && byAddress ? "both" : byId ? "studentId" : "email",
        changes: diffAgainst(record, matched),
      });
      continue;
    }

    // No existing match, but an earlier row in this import already claimed one
    // of the unique values.
    const clashOn = [
      record.studentId && claimedStudentIds.has(record.studentId)
        ? `student ID ${record.studentId}`
        : null,
      claimedEmails.has(record.normalizedEmail)
        ? `email ${record.displayEmail}`
        : null,
    ].filter((value): value is string => value !== null);

    if (clashOn.length > 0) {
      conflicts.push({
        record,
        reason: "duplicate_in_import",
        message: `${describe(record)} reuses ${clashOn.join(" and ")} from an earlier row in this import. Keep one row.`,
        // No stored record is involved: the collision is between two rows of this
        // same file, so there is nothing on file to compare against.
        existing: null,
        candidates: [],
      });
      continue;
    }

    if (record.studentId) {
      claimedStudentIds.add(record.studentId);
    }
    claimedEmails.add(record.normalizedEmail);

    newAttendees.push(record);
  }

  return { newAttendees, updates, conflicts };
}

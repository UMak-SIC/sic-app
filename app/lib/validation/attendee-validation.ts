export const EMAIL_MAX_LENGTH = 254;
export const STUDENT_ID_MAX_LENGTH = 64;
export const ATTENDEE_NAME_MAX_LENGTH = 200;
// Course and program are free text the organizer already spells a particular
// way, and the course KPI groups on the stored value, so they are bounded but
// never normalised or coerced to a fixed set.
export const ATTENDEE_COURSE_MAX_LENGTH = 100;
export const ATTENDEE_PROGRAM_MAX_LENGTH = 100;
export const ATTENDEE_SECTION_MAX_LENGTH = 50;

// Deliberately conservative rather than a full RFC 5322 parser. It accepts the
// shapes real student addresses use and rejects the malformed input that US-10
// requires actionable feedback on.

// No leading or trailing dot, and no consecutive dots in the local part.
const EMAIL_LOCAL_PART =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

// A label may not start or end with a hyphen and is at most 63 characters.
const EMAIL_DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

// Requires an alphabetic TLD, which rejects bare hosts such as "user@localhost".
const EMAIL_TOP_LEVEL_DOMAIN = /^[A-Za-z]{2,}$/;

const STUDENT_ID_ALLOWED_CHARACTERS = /^[A-Za-z0-9._/-]+$/;

export type AttendeeField = "email" | "studentId" | "name" | "course" | "program" | "section";

export type EmailValidationResult =
  | { valid: true; normalizedEmail: string; displayEmail: string }
  | { valid: false; field: "email"; error: string };

export type StudentIdValidationResult =
  | { valid: true; studentId: string }
  | { valid: false; field: "studentId"; error: string };

export type AttendeeNameValidationResult =
  | { valid: true; name: string }
  | { valid: false; field: "name"; error: string };

export type AttendeeCourseValidationResult =
  | { valid: true; value: string }
  | { valid: false; field: "course" | "program" | "section"; error: string };

// Generic so the returned `field` keeps its literal type and satisfies each
// result union rather than widening to AttendeeField.
function failure<F extends AttendeeField>(field: F, error: string) {
  return { valid: false, field, error } as const;
}

// DMA-02 stores both a normalized identity and the display form. Normalization
// is what US-11 requires for case-insensitive matching; the display value keeps
// the addresser's original casing for the email they receive.
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): EmailValidationResult {
  const displayEmail = value.trim();

  if (!displayEmail) {
    return failure("email", "Email address is required.");
  }

  if (displayEmail.length > EMAIL_MAX_LENGTH) {
    return failure("email", `Email address must be at most ${EMAIL_MAX_LENGTH} characters.`);
  }

  const normalizedEmail = displayEmail.toLowerCase();
  const separator = normalizedEmail.lastIndexOf("@");

  if (separator < 1 || separator !== normalizedEmail.indexOf("@")) {
    return failure("email", "Email address must contain exactly one @.");
  }

  const localPart = normalizedEmail.slice(0, separator);
  const domain = normalizedEmail.slice(separator + 1);

  if (localPart.length > 64) {
    return failure("email", "The part before @ must be at most 64 characters.");
  }

  if (!EMAIL_LOCAL_PART.test(localPart)) {
    return failure(
      "email",
      "The part before @ may only use letters, digits, and . ! # $ % & ' * + / = ? ^ _ ` { | } ~ -",
    );
  }

  const labels = domain.split(".");

  if (labels.length < 2) {
    return failure("email", "Email address must include a domain, such as example.com.");
  }

  if (!EMAIL_TOP_LEVEL_DOMAIN.test(labels[labels.length - 1])) {
    return failure("email", "Email address must end with a valid domain, such as .com.");
  }

  for (const label of labels) {
    if (!EMAIL_DOMAIN_LABEL.test(label)) {
      return failure("email", "Each part of the domain must be a valid, non-empty name.");
    }
  }

  return { valid: true, normalizedEmail, displayEmail };
}

export function validateStudentId(value: string): StudentIdValidationResult {
  const studentId = value.trim();

  if (!studentId) {
    return failure("studentId", "Student ID is required.");
  }

  if (studentId !== value) {
    return failure("studentId", "Student ID must not begin or end with whitespace.");
  }

  if (studentId.length > STUDENT_ID_MAX_LENGTH) {
    return failure(
      "studentId",
      `Student ID must be at most ${STUDENT_ID_MAX_LENGTH} characters.`,
    );
  }

  if (!STUDENT_ID_ALLOWED_CHARACTERS.test(studentId)) {
    return failure(
      "studentId",
      "Student ID may only use letters, digits, and the . _ / - separators.",
    );
  }

  return { valid: true, studentId };
}

export function validateAttendeeName(value: string): AttendeeNameValidationResult {
  const name = value.trim().replace(/\s+/g, " ");

  if (!name) {
    return failure("name", "Name is required.");
  }

  if (name.length > ATTENDEE_NAME_MAX_LENGTH) {
    return failure("name", `Name must be at most ${ATTENDEE_NAME_MAX_LENGTH} characters.`);
  }

  return { valid: true, name };
}

/**
 * Validates the optional free-text course and program.
 *
 * Deliberately permissive about content and strict only about length. There is no
 * allow-list of courses: the value comes from a registrar export the organizer
 * controls, and the KPI groups on whatever was stored. Coercing an unrecognised
 * value to a default would invent a course nobody wrote, which is the failure
 * mode the previous client-side parser had.
 */
export function validateAttendeeCourse(value: string): AttendeeCourseValidationResult {
  return validateFreeText("course", value, ATTENDEE_COURSE_MAX_LENGTH);
}

export function validateAttendeeProgram(value: string): AttendeeCourseValidationResult {
  return validateFreeText("program", value, ATTENDEE_PROGRAM_MAX_LENGTH);
}

/**
 * Validates the student's year and block, as the registrar writes it
 * ("BSIT-2A"). Free text for the same reason as course and program: the source
 * is the organizer's own export, and a section code that gets normalised into a
 * fixed set stops matching the registrar's paperwork.
 */
export function validateAttendeeSection(value: string): AttendeeCourseValidationResult {
  return validateFreeText("section", value, ATTENDEE_SECTION_MAX_LENGTH);
}

function validateFreeText(
  field: "course" | "program" | "section",
  value: string,
  maxLength: number,
): AttendeeCourseValidationResult {
  const text = value.trim();

  if (!text) {
    return failure(field, `${label(field)} is required.`);
  }

  if (text.length > maxLength) {
    return failure(field, `${label(field)} must be at most ${maxLength} characters.`);
  }

  return { valid: true, value: text } as AttendeeCourseValidationResult;
}

const FIELD_LABELS: Record<AttendeeField, string> = {
  name: "Full name",
  studentId: "Student number",
  email: "Email address",
  course: "Course",
  program: "Program",
  section: "Section",
};

function label(field: AttendeeField): string {
  return FIELD_LABELS[field];
}

/**
 * Reads a student out of a request body, for the single-record add and edit routes.
 *
 * Hand-rolled rather than zod, per the dependency policy. The rules themselves are
 * the shared validators above, so this only has to do the part a schema library would
 * otherwise do: decide which keys were sent, and refuse a value of the wrong shape
 * with a sentence naming the field.
 *
 * The distinction that matters is absent versus blank. `course` is nullable, so a
 * blank course means "no course", not a validation failure. `name` is not nullable,
 * so a blank name is a mistake worth reporting. Getting that backwards either
 * refuses to clear a field or silently writes an empty string into a required column.
 */
export type AttendeeInputError = { field: AttendeeField; error: string };

export type AttendeeInput = {
  name: string;
  studentId: string;
  email: string;
  course: string | null;
  program: string | null;
  section: string | null;
};

export type AttendeeInputResult =
  | { valid: true; details: AttendeeInput }
  | { valid: false; error: AttendeeInputError };

export type AttendeeChangesInput = Partial<AttendeeInput>;

export type AttendeeChangesResult =
  | { valid: true; changes: AttendeeChangesInput }
  | { valid: false; error: AttendeeInputError };

const OPTIONAL_FIELDS = ["course", "program", "section"] as const;

/** A key counts as sent when it is present at all, including as null. */
function wasSent(source: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, field);
}

function readText(
  source: Record<string, unknown>,
  field: string,
  optional: boolean
): { ok: true; value: string | null } | { ok: false; error: AttendeeInputError } {
  const raw = source[field];

  if (raw === null || raw === undefined) {
    // Absent and explicitly null mean the same thing here: an optional field is not
    // recorded, and a required one is missing. Both are legitimate requests on an
    // edit, where only the fields that were sent are changed.
    return optional
      ? { ok: true, value: null }
      : {
          ok: false,
          error: {
            field: field as AttendeeField,
            error: `${label(field as AttendeeField)} is required.`,
          },
        };
  }

  if (typeof raw !== "string") {
    return {
      ok: false,
      error: { field: field as AttendeeField, error: `${label(field as AttendeeField)} must be text.` },
    };
  }

  return { ok: true, value: raw };
}

/** Shared tail: validate the free-text columns, treating blank as unset. */
function applyFreeText(
  source: Record<string, unknown>,
  field: (typeof OPTIONAL_FIELDS)[number]
): { ok: true; value: string | null } | { ok: false; error: AttendeeInputError } {
  const read = readText(source, field, true);
  if (!read.ok) return read;

  if (read.value === null || read.value.trim() === "") {
    return { ok: true, value: null };
  }

  const validator =
    field === "course"
      ? validateAttendeeCourse
      : field === "program"
        ? validateAttendeeProgram
        : validateAttendeeSection;

  const result = validator(read.value);

  return result.valid
    ? { ok: true, value: result.value }
    : { ok: false, error: { field, error: result.error } };
}

/** Reads every field. Used when adding a student, where all of them are expected. */
export function readAttendeeDetails(body: unknown): AttendeeInputResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: { field: "name", error: "Send the student as a JSON object." } };
  }

  const source = body as Record<string, unknown>;

  const name = readText(source, "name", false);
  if (!name.ok) return { valid: false, error: name.error };
  const validName = validateAttendeeName(name.value as string);
  if (!validName.valid) return { valid: false, error: validName };

  const studentId = readText(source, "studentId", false);
  if (!studentId.ok) return { valid: false, error: studentId.error };
  const validStudentId = validateStudentId(studentId.value as string);
  if (!validStudentId.valid) return { valid: false, error: validStudentId };

  const email = readText(source, "email", false);
  if (!email.ok) return { valid: false, error: email.error };
  const validEmail = validateEmail(email.value as string);
  if (!validEmail.valid) return { valid: false, error: validEmail };

  const details: AttendeeInput = {
    name: validName.name,
    studentId: validStudentId.studentId,
    email: validEmail.displayEmail,
    course: null,
    program: null,
    section: null,
  };

  for (const field of OPTIONAL_FIELDS) {
    const read = applyFreeText(source, field);
    if (!read.ok) return { valid: false, error: read.error };

    details[field] = read.value;
  }

  return { valid: true, details };
}

/**
 * Reads only the fields that were sent, for editing one student.
 *
 * A key that is absent means "leave this alone", which is why this cannot be the
 * same function as the add: sending every field would overwrite the ones the caller
 * never meant to touch.
 */
export function readAttendeeChanges(body: unknown): AttendeeChangesResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: { field: "name", error: "Send the changes as a JSON object." } };
  }

  const source = body as Record<string, unknown>;
  const changes: AttendeeChangesInput = {};

  if (wasSent(source, "name")) {
    const read = readText(source, "name", false);
    if (!read.ok) return { valid: false, error: read.error };
    const result = validateAttendeeName(read.value as string);
    if (!result.valid) return { valid: false, error: result };
    changes.name = result.name;
  }

  if (wasSent(source, "studentId")) {
    const read = readText(source, "studentId", false);
    if (!read.ok) return { valid: false, error: read.error };
    const result = validateStudentId(read.value as string);
    if (!result.valid) return { valid: false, error: result };
    changes.studentId = result.studentId;
  }

  if (wasSent(source, "email")) {
    const read = readText(source, "email", false);
    if (!read.ok) return { valid: false, error: read.error };
    const result = validateEmail(read.value as string);
    if (!result.valid) return { valid: false, error: result };
    changes.email = result.displayEmail;
  }

  for (const field of OPTIONAL_FIELDS) {
    if (!wasSent(source, field)) continue;

    const read = applyFreeText(source, field);
    if (!read.ok) return { valid: false, error: read.error };

    changes[field] = read.value;
  }

  if (Object.keys(changes).length === 0) {
    return {
      valid: false,
      error: { field: "name", error: "Send at least one detail to change." },
    };
  }

  return { valid: true, changes };
}

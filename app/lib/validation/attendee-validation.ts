export const EMAIL_MAX_LENGTH = 254;
export const STUDENT_ID_MAX_LENGTH = 64;
export const ATTENDEE_NAME_MAX_LENGTH = 200;

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

export type AttendeeField = "email" | "studentId" | "name";

export type EmailValidationResult =
  | { valid: true; normalizedEmail: string; displayEmail: string }
  | { valid: false; field: "email"; error: string };

export type StudentIdValidationResult =
  | { valid: true; studentId: string }
  | { valid: false; field: "studentId"; error: string };

export type AttendeeNameValidationResult =
  | { valid: true; name: string }
  | { valid: false; field: "name"; error: string };

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

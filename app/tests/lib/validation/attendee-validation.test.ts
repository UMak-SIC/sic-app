import { describe, expect, test } from "vitest";

import {
  ATTENDEE_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  STUDENT_ID_MAX_LENGTH,
  normalizeEmail,
  validateAttendeeName,
  validateEmail,
  validateStudentId,
} from "@/lib/validation/attendee-validation";

function emailError(value: string): string {
  const result = validateEmail(value);

  if (result.valid) {
    throw new Error(`Expected ${value} to be rejected.`);
  }

  return result.error;
}

function studentIdError(value: string): string {
  const result = validateStudentId(value);

  if (result.valid) {
    throw new Error(`Expected ${value} to be rejected.`);
  }

  return result.error;
}

describe("validateEmail", () => {
  test("accepts ordinary addresses and returns both stored forms", () => {
    expect(validateEmail("Student@Example.COM")).toEqual({
      valid: true,
      normalizedEmail: "student@example.com",
      displayEmail: "Student@Example.COM",
    });

    expect(validateEmail("  spaced@example.com  ")).toEqual({
      valid: true,
      normalizedEmail: "spaced@example.com",
      displayEmail: "spaced@example.com",
    });
  });

  test("accepts the local-part characters permitted by the pattern", () => {
    for (const address of [
      "a.b@example.com",
      "a+b@example.co.uk",
      "first_last@example.com",
      "o'brien@example.com",
      "user123@example-1.com",
      "x!#$%&'*+-/=?^_`{|}~@example.com",
    ]) {
      expect(validateEmail(address), address).toMatchObject({ valid: true });
    }
  });

  test("rejects malformed addresses with a descriptive error", () => {
    expect(emailError("")).toBe("Email address is required.");
    expect(emailError("   ")).toBe("Email address is required.");
    expect(emailError("not-an-email")).toBe("Email address must contain exactly one @.");
    expect(emailError("two@@example.com")).toBe(
      "Email address must contain exactly one @.",
    );
    expect(emailError("@example.com")).toBe("Email address must contain exactly one @.");
    expect(emailError("user@")).toBe(
      "Email address must include a domain, such as example.com.",
    );
    expect(emailError("user@localhost")).toBe(
      "Email address must include a domain, such as example.com.",
    );
    expect(emailError("user@example.1")).toBe(
      "Email address must end with a valid domain, such as .com.",
    );
    expect(emailError("user name@example.com")).toContain("The part before @");
    expect(emailError(".user@example.com")).toContain("The part before @");
    expect(emailError("user.@example.com")).toContain("The part before @");
    expect(emailError("us..er@example.com")).toContain("The part before @");
    expect(emailError("user@-example.com")).toContain("valid, non-empty name");
    expect(emailError("user@example..com")).toContain("valid, non-empty name");
    expect(emailError("user@example.com.")).toContain("valid domain");
  });

  test("enforces the length ceilings", () => {
    const tooLong = `${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`;
    expect(emailError(tooLong)).toBe(
      `Email address must be at most ${EMAIL_MAX_LENGTH} characters.`,
    );

    const longLocal = `${"a".repeat(65)}@example.com`;
    expect(emailError(longLocal)).toBe("The part before @ must be at most 64 characters.");
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases so matching is case-insensitive", () => {
    expect(normalizeEmail("  Student@Example.COM  ")).toBe("student@example.com");
  });

  test("collapses differently-cased and differently-padded inputs to one identity", () => {
    const identities = new Set(
      ["Student@example.com", "student@EXAMPLE.com", "  Student@Example.com  "].map(
        normalizeEmail,
      ),
    );

    expect(identities.size).toBe(1);
    expect([...identities]).toEqual(["student@example.com"]);
  });
});

describe("validateStudentId", () => {
  test("accepts the identifiers a student registry uses", () => {
    for (const id of ["2023-12345", "12345", "AB_1234", "s1234-5678", "id.001"]) {
      expect(validateStudentId(id), id).toEqual({ valid: true, studentId: id });
    }
  });

  test("rejects missing, padded, over-long, and malformed identifiers", () => {
    expect(studentIdError("")).toBe("Student ID is required.");
    expect(studentIdError("   ")).toBe("Student ID is required.");
    expect(studentIdError(" 2023-1")).toBe(
      "Student ID must not begin or end with whitespace.",
    );
    expect(studentIdError("2023-1 ")).toBe(
      "Student ID must not begin or end with whitespace.",
    );
    expect(studentIdError("a".repeat(STUDENT_ID_MAX_LENGTH + 1))).toBe(
      `Student ID must be at most ${STUDENT_ID_MAX_LENGTH} characters.`,
    );
    expect(studentIdError("2023 12345")).toBe(
      "Student ID may only use letters, digits, and the . _ / - separators.",
    );
    expect(studentIdError("2023#12345")).toBe(
      "Student ID may only use letters, digits, and the . _ / - separators.",
    );
  });

  test("accepts the length boundary", () => {
    const atLimit = "a".repeat(STUDENT_ID_MAX_LENGTH);
    expect(validateStudentId(atLimit)).toEqual({ valid: true, studentId: atLimit });
  });
});

describe("validateAttendeeName", () => {
  test("trims and collapses internal whitespace", () => {
    expect(validateAttendeeName("  Juan   Dela   Cruz ")).toEqual({
      valid: true,
      name: "Juan Dela Cruz",
    });
  });

  test("rejects an empty or over-long name", () => {
    expect(validateAttendeeName("")).toMatchObject({ valid: false, field: "name" });
    expect(validateAttendeeName("   ")).toMatchObject({ valid: false, field: "name" });
    expect(validateAttendeeName("a".repeat(ATTENDEE_NAME_MAX_LENGTH + 1))).toMatchObject({
      valid: false,
      field: "name",
    });
  });
});

test("every rejection names the offending field", () => {
  expect(validateEmail("bad")).toMatchObject({ valid: false, field: "email" });
  expect(validateStudentId("bad id")).toMatchObject({
    valid: false,
    field: "studentId",
  });
  expect(validateAttendeeName("")).toMatchObject({ valid: false, field: "name" });
});

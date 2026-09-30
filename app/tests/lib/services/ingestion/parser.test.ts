import { describe, expect, test } from "vitest";

import { parseCsv, parsePastedRecipients } from "@/lib/services/ingestion/parser";

describe("parseCsv", () => {
  test("maps a header row to name, email, and student ID columns", () => {
    const result = parseCsv(
      [
        "Full Name,Email Address,Student ID",
        "Juan Dela Cruz,juan@example.com,2023-1",
        "Maria Santos,maria@example.com,2023-2",
      ].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      {
        row: 2,
        name: "Juan Dela Cruz",
        studentId: "2023-1",
        // The CSV carried no course or program column, so both are null rather
        // than an empty string, which would create an empty KPI bucket.
        course: null,
        program: null,
        normalizedEmail: "juan@example.com",
        displayEmail: "juan@example.com",
      },
      {
        row: 3,
        name: "Maria Santos",
        studentId: "2023-2",
        course: null,
        program: null,
        normalizedEmail: "maria@example.com",
        displayEmail: "maria@example.com",
      },
    ]);
  });

  test("accepts headers in any column order and with varied spelling", () => {
    const result = parseCsv(
      ["Student ID,Name,E-mail", "2023-9,Ana Reyes,ana@example.com"].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({
      row: 2,
      name: "Ana Reyes",
      studentId: "2023-9",
      normalizedEmail: "ana@example.com",
    });
  });

  test("falls back to positional columns when there is no header", () => {
    const result = parseCsv(
      ["Pedro Bautista,pedro@example.com,2023-3", "Lucia,lucia@example.com"].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({
      name: "Pedro Bautista",
      normalizedEmail: "pedro@example.com",
      studentId: "2023-3",
    });
    expect(result.records[1]).toMatchObject({
      name: "Lucia",
      normalizedEmail: "lucia@example.com",
      studentId: null,
    });
  });

  test("preserves the attendee's original casing in displayEmail", () => {
    const result = parseCsv("Name,Email\nJuan,Juan.Cruz@Example.COM");

    expect(result.records[0]).toMatchObject({
      normalizedEmail: "juan.cruz@example.com",
      displayEmail: "Juan.Cruz@Example.COM",
    });
  });

  test("handles quoted fields containing commas, quotes, and newlines", () => {
    const result = parseCsv(
      [
        "Name,Email,Student ID",
        '"Dela Cruz, Juan",juan@example.com,2023-1',
        '"Ana ""The Ace"" Reyes",ana@example.com,2023-2',
        '"Multi\nLine Name",multi@example.com,2023-3',
      ].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.name)).toEqual([
      "Dela Cruz, Juan",
      'Ana "The Ace" Reyes',
      "Multi Line Name",
    ]);
    // The third record starts on source line 4 and spans two lines because of
    // the quoted newline, so it reports the line it begins on.
    expect(result.records[2].row).toBe(4);
  });

  test("tolerates CRLF line endings and a trailing newline", () => {
    const result = parseCsv("Name,Email\r\nAna,ana@example.com\r\n");

    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].row).toBe(2);
  });

  test("reports each malformed row without discarding the valid ones", () => {
    const result = parseCsv(
      [
        "Name,Email,Student ID",
        "Good One,good@example.com,2023-1",
        "Bad Email,not-an-email,2023-2",
        "Bad Student,bad-student@example.com,has spaces",
        "Good Two,good2@example.com,2023-4",
      ].join("\n"),
    );

    expect(result.records.map((record) => record.normalizedEmail)).toEqual([
      "good@example.com",
      "good2@example.com",
    ]);
    expect(result.errors).toEqual([
      { row: 3, field: "email", message: "Email address must contain exactly one @." },
      {
        row: 4,
        field: "studentId",
        message: "Student ID may only use letters, digits, and the . _ / - separators.",
      },
    ]);
  });

  test("rejects a header with no email column", () => {
    const result = parseCsv("Name,Student ID\nAna,2023-1");

    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 1, field: "format" });
  });

  test("reports an unterminated quoted field", () => {
    const result = parseCsv('Name,Email\n"Ana Reyes,ana@example.com');

    expect(result.errors).toEqual([
      { row: 2, field: "format", message: "This row has an unterminated quoted field." },
    ]);
  });

  test("returns empty results for empty or blank input", () => {
    for (const input of ["", "   ", "\n\n"]) {
      expect(parseCsv(input)).toEqual({ records: [], errors: [] });
    }
  });
});

describe("parsePastedRecipients", () => {
  test("accepts newline, comma, and semicolon separated addresses", () => {
    const result = parsePastedRecipients(
      "ana@example.com\nben@example.com,cara@example.com;dan@example.com",
    );

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.normalizedEmail)).toEqual([
      "ana@example.com",
      "ben@example.com",
      "cara@example.com",
      "dan@example.com",
    ]);
  });

  test("strips bullets and numbering from a pasted list", () => {
    const result = parsePastedRecipients(
      ["- ana@example.com", "* ben@example.com", "1. cara@example.com", "2) dan@example.com"].join(
        "\n",
      ),
    );

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.normalizedEmail)).toEqual([
      "ana@example.com",
      "ben@example.com",
      "cara@example.com",
      "dan@example.com",
    ]);
  });

  test("reads a single line holding several addresses", () => {
    const result = parsePastedRecipients("ana@example.com, ben@example.com , cara@example.com");

    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(3);
    expect(result.records.map((record) => record.row)).toEqual([1, 1, 1]);
  });

  test("reads a record line as name, email, and student ID in any order", () => {
    const result = parsePastedRecipients(
      "2023-7,Ana Reyes,ana@example.com\nBen,ben@example.com,2023-8",
    );

    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({
      name: "Ana Reyes",
      studentId: "2023-7",
      normalizedEmail: "ana@example.com",
    });
    expect(result.records[1]).toMatchObject({
      name: "Ben",
      studentId: "2023-8",
      normalizedEmail: "ben@example.com",
    });
  });

  test("reads course and program from named columns", () => {
    const result = parseCsv(
      [
        "Name,Email,Student ID,Course,Program",
        "Ana Reyes,ana@example.com,2023-1,BSIT,BS Information Technology",
      ].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({
      course: "BSIT",
      program: "BS Information Technology",
    });
  });

  test("maps a degree column onto program", () => {
    // Registrar exports spell it either way; dropping it would lose the value.
    const result = parseCsv(
      ["Name,Email,Student ID,Course,Degree", "Ana,ana@example.com,2023-1,BSIT,BS Information Technology"].join(
        "\n",
      ),
    );

    expect(result.records[0]).toMatchObject({ course: "BSIT", program: "BS Information Technology" });
  });

  test("reads course and program positionally when there is no header", () => {
    const result = parseCsv("Ana Reyes,ana@example.com,2023-1,BSCS,BS Computer Science");

    expect(result.records[0]).toMatchObject({ course: "BSCS", program: "BS Computer Science" });
  });

  test("keeps an unrecognised course exactly as written", () => {
    // The previous client-side parser silently coerced anything it did not
    // recognise to BSIT, which invented a course nobody wrote and merged every
    // other bucket into it.
    const result = parseCsv(
      ["Name,Email,Student ID,Course", "Ana,ana@example.com,2023-1,Bachelor of Science in Tourism"].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({ course: "Bachelor of Science in Tourism" });
  });

  test("preserves the author's own casing of a course", () => {
    const result = parseCsv(
      ["Name,Email,Student ID,Course", "Ana,ana@example.com,2023-1,bs information technology"].join("\n"),
    );

    // The KPI groups on the stored string, so lowercasing here would silently
    // merge buckets an organizer meant to keep apart.
    expect(result.records[0]).toMatchObject({ course: "bs information technology" });
  });

  test("rejects a course that is too long rather than truncating it", () => {
    const result = parseCsv(
      ["Name,Email,Student ID,Course", `Ana,ana@example.com,2023-1,${"C".repeat(101)}`].join("\n"),
    );

    // Truncating would store a different string from the one the registrar
    // exported, and the KPI would group on it.
    expect(result.records).toEqual([]);
    expect(result.errors[0]).toMatchObject({ field: "course" });
  });

  test("treats an empty course cell as absent", () => {
    const result = parseCsv(
      ["Name,Email,Student ID,Course,Program", "Ana,ana@example.com,2023-1,,BSIT"].join("\n"),
    );

    expect(result.records[0]).toMatchObject({ course: null, program: "BSIT" });
  });

  test("reports each malformed entry and keeps the rest", () => {
    const result = parsePastedRecipients(
      ["good@example.com", "not-an-email", "another@example.com"].join("\n"),
    );

    expect(result.records.map((record) => record.normalizedEmail)).toEqual([
      "good@example.com",
      "another@example.com",
    ]);
    expect(result.errors).toEqual([
      { row: 2, field: "email", message: "No email address found in this entry." },
    ]);
  });

  test("reports an entry that contains no address at all", () => {
    const result = parsePastedRecipients("Ana Reyes");

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([
      { row: 1, field: "email", message: "No email address found in this entry." },
    ]);
  });

  test("rejects an invalid student ID supplied alongside a valid address", () => {
    const result = parsePastedRecipients("Ana Reyes,ana@example.com,2023 7");

    expect(result.records).toEqual([]);
    expect(result.errors[0]).toMatchObject({ row: 1, field: "studentId" });
  });

  test("returns empty results for empty or blank input", () => {
    for (const input of ["", "   ", "\n\n", "- \n* \n"]) {
      expect(parsePastedRecipients(input)).toEqual({ records: [], errors: [] });
    }
  });
});

test("both parsers produce the same record fields for the same entry", () => {
  const fromCsv = parseCsv("Name,Email\nAna Reyes,ana@example.com");
  const fromPaste = parsePastedRecipients("Ana Reyes,ana@example.com");

  // The CSV has a header, so its line number is one higher by construction.
  expect(fromCsv.records[0]).toEqual({ ...fromPaste.records[0], row: 2 });
});

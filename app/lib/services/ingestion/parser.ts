import {
  validateAttendeeCourse,
  validateAttendeeName,
  validateAttendeeProgram,
  validateAttendeeSection,
  validateEmail,
  validateStudentId,
  type AttendeeField,
} from "@/lib/validation/attendee-validation";

export type IngestionRecord = {
  /** 1-based line in the source where the entry starts. */
  row: number;
  name: string | null;
  studentId: string | null;
  /**
   * Free text, null when the source omits the column. Grouped on for the
   * "which courses do our events reach" KPI, so it is stored as written rather
   * than coerced to a fixed set of values.
   */
  course: string | null;
  program: string | null;
  /** The student's year and block, e.g. "BSIT-2A". Null when not supplied. */
  section: string | null;
  normalizedEmail: string;
  displayEmail: string;
};

export type IngestionError = {
  row: number;
  /** "format" covers structural problems such as an unterminated quoted field. */
  field: AttendeeField | "format";
  message: string;
};

// A bad row never discards the rest of the batch, so a parse always returns both
// collections. US-10 needs the administrator to see every malformed row at once
// rather than fixing them one reload at a time.
export type ParseResult = {
  records: IngestionRecord[];
  errors: IngestionError[];
};

type ColumnMap = {
  name: number;
  email: number;
  studentId: number;
  /** Absent is -1, which readCell turns into null rather than an empty string. */
  course: number;
  program: number;
  section: number;
};

type CsvRow = {
  cells: string[];
  /** Line in the source where this record starts, so multi-line quoted fields
   *  still point the administrator at the right place. */
  line: number;
  unterminatedQuote: boolean;
};


const HEADER_ALIASES: Record<string, keyof ColumnMap> = {
  name: "name",
  fullname: "name",
  studentname: "name",
  email: "email",
  emailaddress: "email",
  studentid: "studentId",
  id: "studentId",
  // "degree" is a common alternative spelling in registrar exports, so it maps to
  // the same column rather than being silently dropped.
  course: "course",
  program: "program",
  degree: "program",
  section: "section",
  block: "section",
  year: "section",
};

// Positional fallback when the CSV has no header row.
const POSITIONAL: ColumnMap = {
  name: 0,
  email: 1,
  studentId: 2,
  course: 3,
  program: 4,
  section: 5,
};

function splitCsvRows(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;

  const pushRow = (unterminatedQuote: boolean) => {
    cells.push(field);
    rows.push({ cells, line: startLine, unterminatedQuote });
    cells = [];
    field = "";
    inQuotes = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") {
          line += 1;
        }
        field += char;
      }
      continue;
    }

    // A quote only opens a quoted field at the start of that field; elsewhere it
    // is literal data, so a quoted name containing a comma still parses.
    if (char === '"' && field === "") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      cells.push(field);
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      line += 1;
      pushRow(false);
      startLine = line;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    pushRow(true);
  } else if (field !== "" || cells.length > 0) {
    pushRow(false);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return trimImportedField(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectColumns(header: string[]): ColumnMap | null {
  const map: ColumnMap = {
    name: -1,
    email: -1,
    studentId: -1,
    course: -1,
    program: -1,
    section: -1,
  };

  header.forEach((cell, index) => {
    const alias = HEADER_ALIASES[normalizeHeader(cell)];

    if (alias && map[alias] === -1) {
      map[alias] = index;
    }
  });

  return map.email === -1 ? null : map;
}

// A header row is one with no address anywhere in it; a data row always has one.
function looksLikeHeader(row: string[]): boolean {
  return row.length > 1 && !row.some((cell) => cell.includes("@"));
}

function readCell(row: string[], column: number): string | null {
  if (column < 0) {
    return null;
  }

  const value = trimImportedField(row[column] ?? "");

  return value === "" ? null : value;
}

// Spreadsheet exports occasionally carry invisible direction and zero-width marks
// around a value. They are not part of an attendee's details and would otherwise
// make an otherwise valid student ID fail validation.
function trimImportedField(value: string): string {
  return value.replace(/^[\s\u200B-\u200D\u200E\u200F\u2060\uFEFF]+|[\s\u200B-\u200D\u200E\u200F\u2060\uFEFF]+$/gu, "");
}

type BuildOutcome =
  | { record: IngestionRecord }
  | { error: IngestionError };

function buildRecord(
  row: number,
  rawName: string | null,
  rawEmail: string | null,
  rawStudentId: string | null,
  // Optional because pasted input resolves only against existing attendees
  // (DMA-02), so it never carries a course or program of its own.
  rawCourse: string | null = null,
  rawProgram: string | null = null,
  rawSection: string | null = null,
): BuildOutcome {
  if (rawEmail === null) {
    return { error: { row, field: "email", message: "Email address is required." } };
  }

  const email = validateEmail(rawEmail);

  if (!email.valid) {
    return { error: { row, field: "email", message: email.error } };
  }

  let name: string | null = null;

  if (rawName !== null) {
    const validated = validateAttendeeName(rawName);

    if (!validated.valid) {
      return { error: { row, field: "name", message: validated.error } };
    }

    name = validated.name;
  }

  let studentId: string | null = null;

  if (rawStudentId !== null) {
    const validated = validateStudentId(rawStudentId);

    if (!validated.valid) {
      return { error: { row, field: "studentId", message: validated.error } };
    }

    studentId = validated.studentId;
  }

  let course: string | null = null;

  if (rawCourse !== null) {
    const validated = validateAttendeeCourse(rawCourse);

    if (!validated.valid) {
      return { error: { row, field: validated.field, message: validated.error } };
    }

    course = validated.value;
  }

  let program: string | null = null;

  if (rawProgram !== null) {
    const validated = validateAttendeeProgram(rawProgram);

    if (!validated.valid) {
      return { error: { row, field: validated.field, message: validated.error } };
    }

    program = validated.value;
  }

  let section: string | null = null;

  if (rawSection !== null) {
    const validated = validateAttendeeSection(rawSection);

    if (!validated.valid) {
      return { error: { row, field: validated.field, message: validated.error } };
    }

    section = validated.value;
  }

  return {
    record: {
      row,
      name,
      studentId,
      course,
      program,
      section,
      normalizedEmail: email.normalizedEmail,
      displayEmail: email.displayEmail,
    },
  };
}

// Strips the decorations people paste from a bulleted or numbered list.
function stripListDecoration(value: string): string {
  return trimImportedField(value.replace(/^\s*(?:[-*•‣▪]|\d+[.)])\s+/, ""));
}

// US-09: comma, line break, or list separated. Splitting on all of them at once
// is safe because none of the characters are legal in an unquoted address.
const PASTED_DELIMITERS = /[,;\t\n]+/;

// Given the non-address cells of one pasted record line, decide which is the name
// and which is the student ID. Column order is not reliable in a pasted list, so
// role is decided by shape rather than position.
//
// Shape alone is ambiguous: "Ben" is all letters and passes the student ID
// pattern. A digit is the reliable discriminator, because a person's name does
// not contain one and a student ID essentially always does.
function looksLikeStudentId(cell: string): boolean {
  return /\d/.test(cell) && validateStudentId(cell).valid;
}

function assignNameAndStudentId(
  others: string[],
): { name: string | null; studentId: string | null } {
  if (others.length === 0) {
    return { name: null, studentId: null };
  }

  if (others.length === 1) {
    return { name: others[0], studentId: null };
  }

  const studentIdIndex = others.findIndex(looksLikeStudentId);

  if (studentIdIndex === -1) {
    // Neither cell is a plausible student ID. Keep the first as the name so the
    // second is reported as a student ID error rather than silently dropped.
    return { name: others[0], studentId: others[1] };
  }

  return {
    name: others.find((_, index) => index !== studentIdIndex) ?? null,
    studentId: others[studentIdIndex],
  };
}

export function parsePastedRecipients(input: string): ParseResult {
  const records: IngestionRecord[] = [];
  const errors: IngestionError[] = [];

  if (!input.trim()) {
    return { records, errors };
  }

  input.split(/\r?\n/).forEach((line, lineIndex) => {
    if (!line.trim()) {
      return;
    }

    const row = lineIndex + 1;
    const cells = line
      .split(PASTED_DELIMITERS)
      .map(stripListDecoration)
      .filter((cell) => cell !== "");

    if (cells.length === 0) {
      return;
    }

    // Every cell is an address, so the line held several addresses rather than
    // one record with fields.
    if (cells.every((cell) => cell.includes("@"))) {
      for (const cell of cells) {
        const outcome = buildRecord(row, null, cell, null);
        recordsOrError(outcome, records, errors);
      }

      return;
    }

    const emailIndex = cells.findIndex((cell) => cell.includes("@"));

    if (emailIndex === -1) {
      errors.push({
        row,
        field: "email",
        message: "No email address found in this entry.",
      });
      return;
    }

    const { name, studentId } = assignNameAndStudentId(
      cells.filter((_, index) => index !== emailIndex),
    );

    recordsOrError(buildRecord(row, name, cells[emailIndex], studentId), records, errors);
  });

  return { records, errors };
}

function recordsOrError(
  outcome: BuildOutcome,
  records: IngestionRecord[],
  errors: IngestionError[],
): void {
  if ("record" in outcome) {
    records.push(outcome.record);
  } else {
    errors.push(outcome.error);
  }
}

// US-07: CSV import with header mapping and a positional fallback.
export function parseCsv(input: string): ParseResult {
  const records: IngestionRecord[] = [];
  const errors: IngestionError[] = [];
  const rows = splitCsvRows(input);

  if (rows.length === 0) {
    return { records, errors };
  }

  let columns: ColumnMap | null = null;
  let body = rows;

  if (looksLikeHeader(rows[0].cells)) {
    const detected = detectColumns(rows[0].cells);

    if (!detected) {
      errors.push({
        row: rows[0].line,
        field: "format",
        message:
          "Could not find an email column. Include a header row with an 'email' column.",
      });
      return { records, errors };
    }

    columns = detected;
    body = rows.slice(1);
  } else {
    columns = POSITIONAL;
  }

  for (const row of body) {
    if (row.unterminatedQuote) {
      errors.push({
        row: row.line,
        field: "format",
        message: "This row has an unterminated quoted field.",
      });
      continue;
    }

    if (row.cells.every((cell) => cell.trim() === "")) {
      continue;
    }

    recordsOrError(
      buildRecord(
        row.line,
        readCell(row.cells, columns.name),
        readCell(row.cells, columns.email),
        readCell(row.cells, columns.studentId),
        readCell(row.cells, columns.course),
        readCell(row.cells, columns.program),
        readCell(row.cells, columns.section),
      ),
      records,
      errors,
    );
  }

  return { records, errors };
}

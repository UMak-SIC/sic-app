/**
 * Saving one student: adding, editing and removing.
 *
 * Each call sends only what changed. The remove call is a soft delete on the server,
 * which is why nothing here has to decide what happens to the student's history.
 *
 * The server owns the wording of every refusal, so these functions surface its
 * sentence rather than inventing one. The field travels with it for the form to put
 * the message on the right input.
 */

export type AttendeeFieldName =
  | "name"
  | "studentId"
  | "email"
  | "course"
  | "program"
  | "section";

/** A refusal the operator can act on, with the field it belongs to when there is one. */
export class AttendeeSaveError extends Error {
  constructor(
    message: string,
    readonly field: AttendeeFieldName | null = null,
    readonly status: number = 400
  ) {
    super(message);
    this.name = "AttendeeSaveError";
  }
}

export type StudentDetails = {
  name: string;
  studentId: string;
  email: string;
  course: string | null;
  program: string | null;
  section: string | null;
};

export type StudentChanges = Partial<StudentDetails>;

async function readRefusal(response: Response, fallback: string): Promise<AttendeeSaveError> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    field?: AttendeeFieldName;
  } | null;

  return new AttendeeSaveError(body?.error ?? fallback, body?.field ?? null, response.status);
}

/**
 * Adds a student.
 *
 * `restored` is true when the student had been removed from the directory and this
 * brought them back rather than creating a second record, which is what happens when
 * their student number or email is still held by the row they left behind.
 */
export async function createStudent(
  details: StudentDetails,
  signal?: AbortSignal
): Promise<{ id: string; restored: boolean }> {
  const response = await fetch("/api/attendees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
    signal,
  });

  if (!response.ok) {
    throw await readRefusal(response, "That student could not be added. Try again.");
  }

  return (await response.json()) as { id: string; restored: boolean };
}

/** Edits a student. Only the fields given are changed. */
export async function updateStudent(
  id: string,
  changes: StudentChanges,
  signal?: AbortSignal
): Promise<{ id: string }> {
  const response = await fetch(`/api/attendees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
    signal,
  });

  if (!response.ok) {
    throw await readRefusal(response, "Those changes could not be saved. Try again.");
  }

  return (await response.json()) as { id: string };
}

/**
 * Removes a student from the directory.
 *
 * The record itself is kept, so their attendance history stays intact and adding them
 * again brings it back with them. That is what the confirmation says, because "delete"
 * on a button implies otherwise.
 */
export async function removeStudent(id: string, signal?: AbortSignal): Promise<{ id: string }> {
  const response = await fetch(`/api/attendees/${id}`, {
    method: "DELETE",
    signal,
  });

  if (!response.ok) {
    throw await readRefusal(response, "That student could not be removed. Try again.");
  }

  return (await response.json()) as { id: string };
}

export type RemoveStudentsResult = {
  removed: number;
  alreadyRemoved: number;
  unknownCount: number;
  unknownIds: string[];
};

/**
 * Removes several students in one request.
 *
 * All or nothing, which is why this is a single call rather than a loop over
 * `removeStudent`. Fifty separate requests means fifty chances to stop part way, and
 * a bulk removal that quietly did half of what was asked is worse than one that did
 * none, because nobody can tell which half.
 */
export async function removeStudents(
  ids: string[],
  signal?: AbortSignal
): Promise<RemoveStudentsResult> {
  const response = await fetch("/api/attendees/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal,
  });

  if (!response.ok) {
    throw await readRefusal(response, "Those students could not be removed. Try again.");
  }

  return (await response.json()) as RemoveStudentsResult;
}

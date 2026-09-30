import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RosterEntryStatus } from "@prisma/client";

const { findMany, count, transaction } = vi.hoisted(() => {
  const findMany = vi.fn();
  const count = vi.fn();
  return {
    findMany,
    count,
    // Mirrors Prisma's array form: the two reads run together.
    transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ attendee: { findMany, count }, $transaction: transaction }),
}));

import { listAttendees } from "@/lib/services/attendee-directory-service";

const attended = {
  status: RosterEntryStatus.ATTENDED,
  event: { id: "evt-1", name: "General Assembly", startsAt: new Date("2026-10-17T00:00:00.000Z") },
};
const pending = {
  status: RosterEntryStatus.PENDING,
  event: { id: "evt-2", name: "Cloud Computing 101", startsAt: new Date("2026-10-23T00:00:00.000Z") },
};

function attendee(overrides: Record<string, unknown> = {}) {
  return {
    id: "6a5d30af-f299-4c8c-8de2-cbfa9d79d3df",
    name: "Andrea Santos",
    studentId: "2023-00182",
    displayEmail: "andrea.santos@umak.edu.ph",
    course: null,
    program: null,
    createdAt: new Date("2026-09-12T00:00:00.000Z"),
    rosterEntries: [attended, pending],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([attendee()]);
  count.mockResolvedValue(1);
});

afterEach(() => {
  vi.resetAllMocks();
});

test("returns the directory shape the table already expects", async () => {
  const { attendees } = await listAttendees();

  expect(attendees).toEqual([
    {
      id: "6a5d30af-f299-4c8c-8de2-cbfa9d79d3df",
      name: "Andrea Santos",
      studentId: "2023-00182",
      // displayEmail, not normalizedEmail: DMA-02 keeps the normalised form for
      // matching and the display form for what a human sees.
      email: "andrea.santos@umak.edu.ph",
      course: null,
      program: null,
      joinedDate: new Date("2026-09-12T00:00:00.000Z"),
      events: [
        {
          id: "evt-1",
          name: "General Assembly",
          startsAt: new Date("2026-10-17T00:00:00.000Z"),
          attended: true,
        },
        {
          id: "evt-2",
          name: "Cloud Computing 101",
          startsAt: new Date("2026-10-23T00:00:00.000Z"),
          attended: false,
        },
      ],
      totalEventsJoined: 2,
      attendedEventsCount: 1,
      attendanceRate: 50,
    },
  ]);
});

test("returns no event short code", async () => {
  // #109 resolved this the other way from course/program: the event already has
  // a unique id, so the badge is dropped from the UI rather than given a column.
  const { attendees } = await listAttendees();

  expect(Object.keys(attendees[0]).sort()).toEqual([
    "attendanceRate",
    "attendedEventsCount",
    "course",
    "email",
    "events",
    "id",
    "joinedDate",
    "name",
    "program",
    "studentId",
    "totalEventsJoined",
  ]);
  expect(Object.keys(attendees[0].events[0]).sort()).toEqual([
    "attended",
    "id",
    "name",
    "startsAt",
  ]);
});

test("carries course and program for the course-reach KPI", async () => {
  findMany.mockResolvedValue([attendee({ course: "BSIT", program: "BS Information Technology" })]);

  const { attendees } = await listAttendees();

  expect(attendees[0]).toMatchObject({
    course: "BSIT",
    program: "BS Information Technology",
  });
});

test("reports a null course rather than an empty string", async () => {
  // An empty string is indistinguishable from a student who genuinely has no
  // course, and would create an empty bucket in the KPI.
  findMany.mockResolvedValue([attendee({ course: null, program: null })]);

  const { attendees } = await listAttendees();

  expect(attendees[0].course).toBeNull();
  expect(attendees[0].program).toBeNull();
});

test("reports a zero rate for an attendee on no roster", async () => {
  findMany.mockResolvedValue([attendee({ rosterEntries: [] })]);

  const { attendees } = await listAttendees();

  // Not a division by zero.
  expect(attendees[0]).toMatchObject({
    totalEventsJoined: 0,
    attendedEventsCount: 0,
    attendanceRate: 0,
  });
});

test("reports a full rate when every event was attended", async () => {
  findMany.mockResolvedValue([attendee({ rosterEntries: [attended, { ...attended, event: { ...attended.event, id: "evt-9" } }] })]);

  const { attendees } = await listAttendees();

  expect(attendees[0]).toMatchObject({ attendedEventsCount: 2, attendanceRate: 100 });
});

test("rounds a partial rate to a whole percent", async () => {
  findMany.mockResolvedValue([attendee({ rosterEntries: [attended, pending, pending] })]);

  const { attendees } = await listAttendees();

  // 1 of 3 is 33.33%; a fraction would render as a stray decimal in the table.
  expect(attendees[0].attendanceRate).toBe(33);
});

test("searches name, email and student number case-insensitively", async () => {
  await listAttendees({ search: "  andrea  " });

  const where = findMany.mock.calls[0][0].where;
  expect(where.OR).toEqual([
    { name: { contains: "andrea", mode: "insensitive" } },
    { displayEmail: { contains: "andrea", mode: "insensitive" } },
    { studentId: { contains: "andrea", mode: "insensitive" } },
  ]);
});

test("omits the search filter when no term is given", async () => {
  await listAttendees();
  expect(findMany.mock.calls[0][0].where).toEqual({});

  vi.clearAllMocks();
  await listAttendees({ search: "   " });
  expect(findMany.mock.calls[0][0].where).toEqual({});
});

test("attendedOnly keeps only people marked present at least once", async () => {
  await listAttendees({ attendedOnly: true });

  // US-08. No date filter: ATTENDED already means past, because nobody is marked
  // present at an event that has not happened.
  expect(findMany.mock.calls[0][0].where).toEqual({
    rosterEntries: { some: { status: RosterEntryStatus.ATTENDED } },
  });
  expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
});

test("paginates with the default page size", async () => {
  await listAttendees();

  expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 25 });
});

test("paginates on later pages", async () => {
  await listAttendees({ page: 3, pageSize: 10 });

  expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 10 });
});

test("orders by name and events by most recent first", async () => {
  await listAttendees();

  expect(findMany.mock.calls[0][0].orderBy).toEqual({ name: "asc" });
  expect(findMany.mock.calls[0][0].select.rosterEntries.orderBy).toEqual({
    event: { startsAt: "desc" },
  });
});

test("counts the total separately from the page", async () => {
  count.mockResolvedValue(137);

  const { pagination } = await listAttendees({ page: 2, pageSize: 25 });

  expect(pagination).toEqual({ page: 2, pageSize: 25, total: 137, totalPages: 6 });
});

test("reports a single empty page rather than zero pages when nobody is enrolled", async () => {
  findMany.mockResolvedValue([]);
  count.mockResolvedValue(0);

  // totalPages: 0 would make a client render a page control with nothing on it.
  const { pagination } = await listAttendees();

  expect(pagination.totalPages).toBe(1);
});

test("reads the page and the total together", async () => {
  await listAttendees();

  // Two separate awaits would let a concurrent write skew the count.
  expect(transaction).toHaveBeenCalledOnce();
  expect(transaction).toHaveBeenCalledWith([expect.anything(), expect.anything()]);
});

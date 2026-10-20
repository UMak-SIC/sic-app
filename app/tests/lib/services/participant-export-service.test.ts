import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { events, people } = vi.hoisted(() => ({ events: vi.fn(), people: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ event: { findMany: events }, attendee: { findMany: people } }) }));
import { exportEvents, exportParticipants, exportEventParticipants } from "@/lib/services/participant-export-service";

const date = new Date("2026-10-20T01:00:00.000Z");
const person = { id: "person-1", name: 'María "Mia", Santos', displayEmail: "maria@example.test", studentId: "00123", course: "BSIT", program: "Information Technology", section: "BSIT-2A", createdAt: date, deletedAt: null };
const event = { id: "event-1", name: "General Assembly", details: "Welcome\nEveryone", venue: "Auditorium", status: "PUBLISHED", startsAt: date, endsAt: date, closedAt: null, createdAt: date };
const entry = { status: "ATTENDED", arrivedAt: date, createdAt: date, deliveries: [{ sentAt: date }] };
beforeEach(() => vi.stubEnv("ORGANIZATION_TIMEZONE", "Asia/Manila"));
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

test("exports profiles, event details, attendance and ticket timestamps", async () => {
  events.mockResolvedValue([{ ...event, rosterEntries: [{ ...entry, attendee: person }] }]);
  const { csv } = await exportEvents(["event-1"]);
  expect(csv).toContain('"Section"');
  expect(csv).toContain('"María ""Mia"", Santos"');
  expect(csv).toContain('"BSIT","Information Technology","BSIT-2A"');
  expect(csv).toContain('"Welcome\nEveryone"');
  expect(csv).toContain('"Asia/Manila"');
  expect(csv).toContain('"Attended","2026-10-20T01:00:00.000Z","2026-10-20T01:00:00.000Z","Sent","2026-10-20T01:00:00.000Z"');
  expect(events).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: { in: ["event-1"] } },
    select: expect.objectContaining({ rosterEntries: expect.objectContaining({
      select: expect.objectContaining({
        attendee: { select: expect.objectContaining({ course: true, program: true, section: true, deletedAt: true }) },
        deliveries: expect.objectContaining({ where: { status: "SENT" }, orderBy: { sentAt: "desc" }, take: 1 }),
      }),
    }) }),
  }));
});

test("keeps empty events, every attendance status and removed students", async () => {
  events.mockResolvedValue([
    { ...event, name: "Empty event", rosterEntries: [] },
    { ...event, rosterEntries: [
      { ...entry, attendee: person },
      { ...entry, status: "PENDING", arrivedAt: null, deliveries: [], attendee: { ...person, name: "Pending student", section: null } },
      { ...entry, status: "ABSENT", arrivedAt: null, deliveries: [], attendee: { ...person, name: "Removed student", deletedAt: date } },
    ] },
  ]);
  const { csv } = await exportEvents(["event-1"]);
  expect(csv).toContain('"Empty event"');
  expect(csv).toContain('"Pending student"');
  expect(csv).toContain('"Removed student"');
  expect(csv).toContain('"Not recorded","","2026-10-20T01:00:00.000Z","Not sent",""');
  expect(csv).toContain('"Absent",""');
  expect(csv).toContain('"3","1","1","1"');
});

test("directory export keeps attendance rows and students with no events", async () => {
  people.mockResolvedValue([
    { ...person, rosterEntries: [{ ...entry, event }, { ...entry, status: "ABSENT", arrivedAt: null, event: { ...event, name: "Second event" } }] },
    { ...person, name: "New student", rosterEntries: [] },
  ]);
  const csv = await exportParticipants(["person-1", "person-2"]);
  expect(csv).not.toContain('"General Assembly"');
  expect(csv).not.toContain('"Second event"');
  expect(csv).toContain('"New student"');
  expect(csv).toContain('"2","1","50"');
  expect(people).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["person-1", "person-2"] }, deletedAt: null } }));
});

const attendeeHeaders = ["Participant ID", "Name", "Email", "Student ID", "Course Track", "Degree Program", "Section"];
const attendanceHeaders = ["Attendance", "Check-in Time (UTC)", "Check-in Time (GMT+8)"];
const headerLine = (headers: string[]) => `\uFEFF${headers.map((header) => `"${header}"`).join(",")}`;

test("event-details attendee export contains only the requested participant columns", async () => {
  events.mockResolvedValue([{ ...event, rosterEntries: [{ ...entry, attendee: person }] }]);
  const { csv } = await exportEventParticipants("event-1");
  expect(csv.split("\r\n")[0]).toBe(headerLine([...attendeeHeaders, ...attendanceHeaders]));
  expect(csv).toContain('"2026-10-20T01:00:00.000Z","2026-10-20T09:00:00+08:00"');
  expect(csv).not.toContain('"General Assembly"');
  expect(events).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["event-1"] } } }));
});

test("directory export drops event, profile date and ticket columns", async () => {
  people.mockResolvedValue([{ ...person, rosterEntries: [{ ...entry, event }] }]);
  const csv = await exportParticipants(["person-1"]);
  expect(csv.split("\r\n")[0]).toBe(headerLine([
    ...attendeeHeaders, "Registered Events Count", "Attended Events Count", "Attendance Rate (%)", ...attendanceHeaders,
  ]));
  expect(csv).toContain('"2026-10-20T01:00:00.000Z","2026-10-20T09:00:00+08:00"');
});

test.each([
  [new Date("2026-10-20T22:15:30.000Z"), "2026-10-21T06:15:30+08:00"],
  [null, ""],
])("GMT+8 check-in handles midnight rollover and missing attendance: %s", async (arrivedAt, expected) => {
  vi.stubEnv("ORGANIZATION_TIMEZONE", "America/New_York");
  events.mockResolvedValue([{ ...event, rosterEntries: [{ ...entry, arrivedAt, attendee: person }] }]);
  people.mockResolvedValue([{ ...person, rosterEntries: [{ ...entry, arrivedAt }] }]);
  const eventCsv = (await exportEventParticipants("event-1")).csv;
  const directoryCsv = await exportParticipants(["person-1"]);
  for (const csv of [eventCsv, directoryCsv]) {
    expect(csv.split("\r\n")[1].endsWith(`"${arrivedAt?.toISOString() ?? ""}","${expected}"`)).toBe(true);
  }
});

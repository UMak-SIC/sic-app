import { afterEach, expect, test, vi } from "vitest";

const { count, findUnique } = vi.hoisted(() => ({ count: vi.fn(), findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ event: { findUnique }, eventRosterEntry: { count } }),
}));

import { getEventAttendance, toAttendanceCsv } from "@/lib/services/attendance-service";

afterEach(() => vi.resetAllMocks());

test("searches attendance by attendee identity", async () => {
  findUnique.mockResolvedValue({ _count: { rosterEntries: 4 }, rosterEntries: [] });
  count.mockResolvedValue(3);

  await getEventAttendance("event-id", "Ada");

  expect(findUnique).toHaveBeenCalledWith({
    where: { id: "event-id" },
    select: expect.objectContaining({
      rosterEntries: expect.objectContaining({
        where: {
          attendee: {
            OR: [
              { name: { contains: "Ada", mode: "insensitive" } },
              { displayEmail: { contains: "Ada", mode: "insensitive" } },
              { studentId: { contains: "Ada", mode: "insensitive" } },
            ],
          },
        },
      }),
    }),
  });
  expect(count).toHaveBeenCalledWith({ where: { eventId: "event-id", status: "ATTENDED" } });
});

test("keeps event-wide totals when roster rows are filtered", async () => {
  findUnique.mockResolvedValue({ _count: { rosterEntries: 14 }, rosterEntries: [] });
  count.mockResolvedValue(9);

  await expect(getEventAttendance("event-id", "Ada")).resolves.toMatchObject({
    attendedCount: 9,
    totalRosterEntries: 14,
  });
});

test("serializes full attendance fields as an escaped CSV document", () => {
  expect(
    toAttendanceCsv([
      {
        name: 'Ada "Ace" Lovelace',
        email: "ada@example.test",
        studentId: "SIC-001",
        status: "attended",
        arrivedAt: new Date("2026-10-01T10:00:00.000Z"),
      },
    ]),
  ).toBe(
    'name,email,student_id,status,checked_in_at\r\n"Ada ""Ace"" Lovelace","ada@example.test","SIC-001","attended","2026-10-01T10:00:00.000Z"',
  );
});

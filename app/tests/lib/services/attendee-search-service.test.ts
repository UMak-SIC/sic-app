import { afterEach, beforeEach, expect, test, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => ({ $queryRaw: queryRaw }) }));

import { searchGlobalAttendees } from "@/lib/services/attendee-search-service";

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockResolvedValue([
    {
      id: "6a5d30af-f299-4c8c-8de2-cbfa9d79d3df",
      name: "Andrea Santos",
      student_id: "2023-00182",
      display_email: "andrea.santos@umak.edu.ph",
      course: "BSIT",
      program: null,
      section: "BSIT-2A",
      created_at: new Date("2026-09-12T00:00:00.000Z"),
      events: [{ id: "event-1", name: "General Assembly", startsAt: "2026-10-17T00:00:00.000Z", attended: true }],
      total_count: BigInt(4),
    },
  ]);
});

afterEach(() => vi.resetAllMocks());

test("maps the guarded search result into the directory shape", async () => {
  const result = await searchGlobalAttendees({
    adminId: "admin-1",
    search: "andrea",
    attendedOnly: false,
    page: 2,
    pageSize: 25,
  });

  expect(queryRaw).toHaveBeenCalledOnce();
  expect(queryRaw.mock.calls[0][0].strings.join("?")).toContain(
    "?::text,\n      ?::text,\n      ?::boolean,\n      ?::text,\n      ?::uuid,\n      ?::integer,\n      ?::integer"
  );
  expect(queryRaw.mock.calls[0][0].values).toEqual(["admin-1", "andrea", false, null, null, 2, 25]);
  expect(result).toMatchObject({
    attendees: [{ email: "andrea.santos@umak.edu.ph", attendanceRate: 100, totalEventsJoined: 1 }],
    pagination: { page: 2, pageSize: 25, total: 4, totalPages: 1 },
  });
  expect(result.attendees[0].events[0].startsAt).toEqual(new Date("2026-10-17T00:00:00.000Z"));
});

test("reports an empty search as one empty page", async () => {
  queryRaw.mockResolvedValue([]);

  await expect(searchGlobalAttendees({ adminId: "admin-1", attendedOnly: false, page: 1, pageSize: 25 }))
    .resolves.toMatchObject({ attendees: [], pagination: { total: 0, totalPages: 1 } });
});

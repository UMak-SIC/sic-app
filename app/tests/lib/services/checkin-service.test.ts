import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { updateMany, findFirst, findUnique, eventFindUnique, transaction, verifyQrTicket } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  eventFindUnique: vi.fn(),
  transaction: vi.fn(),
  verifyQrTicket: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    $transaction: transaction,
    event: { findUnique: eventFindUnique },
    eventRosterEntry: { findFirst, findUnique, updateMany },
  }),
}));

vi.mock("@/lib/security/qr-signer", () => ({ verifyQrTicket }));

import { checkInRosterEntry, recordCheckIn, updateAttendanceRecord } from "@/lib/services/checkin-service";

beforeEach(() => {
  transaction.mockImplementation((callback) =>
    callback({
      event: { findUnique: eventFindUnique },
      eventRosterEntry: { updateMany, findUnique },
    }),
  );
  updateMany.mockResolvedValue({ count: 1 });
  eventFindUnique.mockResolvedValue(null);
});

afterEach(() => vi.resetAllMocks());

test("marks a pending event roster entry attended atomically", async () => {
  const arrivedAt = new Date("2026-10-01T10:00:00.000Z");
  updateMany.mockResolvedValue({ count: 1 });

  await expect(
    checkInRosterEntry({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      scannedByAdminId: "admin-id",
      arrivedAt,
    }),
  ).resolves.toEqual({ status: "checked_in", arrivedAt, isLate: false });

  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "entry-id", eventId: "event-id", status: "PENDING" },
    data: { status: "ATTENDED", arrivedAt, scannedByAdminId: "admin-id" },
  });
  expect(findUnique).not.toHaveBeenCalled();
});

test("marks a pending event roster entry late if arriving past 15 minutes", async () => {
  const startsAt = new Date("2026-10-01T09:00:00.000Z");
  const arrivedAt = new Date("2026-10-01T09:20:00.000Z");
  eventFindUnique.mockResolvedValue({ startsAt });
  updateMany.mockResolvedValue({ count: 1 });

  await expect(
    checkInRosterEntry({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      scannedByAdminId: "admin-id",
      arrivedAt,
    }),
  ).resolves.toEqual({ status: "checked_in", arrivedAt, isLate: true });

  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "entry-id", eventId: "event-id", status: "PENDING" },
    data: { status: "LATE", arrivedAt, scannedByAdminId: "admin-id" },
  });
});

test("reports the original arrival time when an attended ticket is scanned again", async () => {
  const originalArrival = new Date("2026-10-01T09:57:00.000Z");
  updateMany.mockResolvedValue({ count: 0 });
  findUnique.mockResolvedValue({ status: "ATTENDED", arrivedAt: originalArrival });

  await expect(
    checkInRosterEntry({ eventId: "event-id", rosterEntryId: "entry-id", scannedByAdminId: "admin-id" }),
  ).resolves.toEqual({ status: "duplicate", arrivedAt: originalArrival });

  expect(findUnique).toHaveBeenCalledWith({
    where: { eventId_id: { eventId: "event-id", id: "entry-id" } },
    select: { status: true, arrivedAt: true },
  });
});

test("does not treat missing or non-pending entries as successful check-ins", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  findUnique.mockResolvedValue({ status: "ABSENT", arrivedAt: null });

  await expect(
    checkInRosterEntry({ eventId: "event-id", rosterEntryId: "entry-id", scannedByAdminId: "admin-id" }),
  ).resolves.toEqual({ status: "unavailable" });
});

test("records an admin attendance edit with the requested arrival time", async () => {
  const arrival = new Date("2026-10-01T10:05:00.000Z");
  findUnique.mockResolvedValue({ status: "ATTENDED", arrivedAt: arrival });
  updateMany.mockResolvedValue({ count: 1 });

  await expect(
    updateAttendanceRecord({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      status: "ATTENDED",
      arrivedAt: arrival,
      updatedByAdminId: "admin-id",
    }),
  ).resolves.toEqual({ status: "ATTENDED", arrivedAt: arrival });

  expect(findUnique).toHaveBeenCalledWith({
    where: { eventId_id: { eventId: "event-id", id: "entry-id" } },
    select: { status: true, arrivedAt: true },
  });
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "entry-id", eventId: "event-id" },
    data: { status: "ATTENDED", arrivedAt: arrival, scannedByAdminId: "admin-id" },
  });
});

test("keeps the recorded arrival time when re-marking someone attended", async () => {
  const originalArrival = new Date("2026-10-01T09:50:00.000Z");
  findUnique.mockResolvedValue({ status: "ATTENDED", arrivedAt: originalArrival });

  await expect(
    updateAttendanceRecord({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      status: "ATTENDED",
      updatedByAdminId: "admin-id",
    }),
  ).resolves.toEqual({ status: "ATTENDED", arrivedAt: originalArrival });

  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: { status: "ATTENDED", arrivedAt: originalArrival, scannedByAdminId: "admin-id" } }),
  );
});

test("stamps a fresh arrival time when a pending record becomes attended", async () => {
  findUnique.mockResolvedValue({ status: "PENDING", arrivedAt: null });

  const result = await updateAttendanceRecord({
    eventId: "event-id",
    rosterEntryId: "entry-id",
    status: "ATTENDED",
    updatedByAdminId: "admin-id",
  });

  expect(result?.status).toBe("ATTENDED");
  expect(result?.arrivedAt).toBeInstanceOf(Date);
  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: "ATTENDED", scannedByAdminId: "admin-id" }) }),
  );
});

test("clears the arrival time and editor when the record moves away from attended", async () => {
  findUnique.mockResolvedValue({ status: "ATTENDED", arrivedAt: new Date("2026-10-01T09:50:00.000Z") });

  await expect(
    updateAttendanceRecord({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      status: "PENDING",
      updatedByAdminId: "admin-id",
    }),
  ).resolves.toEqual({ status: "PENDING", arrivedAt: null });

  // The event_roster_entries check constraint requires non-attended rows to
  // carry neither an arrival time nor a recorded admin.
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "entry-id", eventId: "event-id" },
    data: { status: "PENDING", arrivedAt: null, scannedByAdminId: null },
  });
});

test("stamps the editing admin only when marking someone attended", async () => {
  findUnique.mockResolvedValue({ status: "PENDING", arrivedAt: null });
  updateMany.mockResolvedValue({ count: 1 });

  await updateAttendanceRecord({
    eventId: "event-id",
    rosterEntryId: "entry-id",
    status: "ABSENT",
    updatedByAdminId: "editor-admin-id",
  });

  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: { status: "ABSENT", arrivedAt: null, scannedByAdminId: null } }),
  );
});

test("refuses to edit a roster entry outside the event or missing entirely", async () => {
  findUnique.mockResolvedValue(null);

  await expect(
    updateAttendanceRecord({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      status: "ABSENT",
      updatedByAdminId: "admin-id",
    }),
  ).resolves.toBeNull();

  expect(updateMany).not.toHaveBeenCalled();
});

test("reports a missing record when the entry disappears before the save", async () => {
  findUnique.mockResolvedValue({ status: "PENDING", arrivedAt: null });
  updateMany.mockResolvedValue({ count: 0 });

  await expect(
    updateAttendanceRecord({
      eventId: "event-id",
      rosterEntryId: "entry-id",
      status: "ATTENDED",
      updatedByAdminId: "admin-id",
    }),
  ).resolves.toBeNull();
});

test("returns an expired ticket reason without looking up a roster entry", async () => {
  verifyQrTicket.mockReturnValue({
    valid: false,
    reason: "expired",
    message: "This QR ticket has expired.",
  });

  await expect(
    recordCheckIn({ eventId: "event-id", ticketTokenOrCode: "expired-ticket", adminId: "admin-id" }),
  ).resolves.toEqual({
    status: "invalid",
    reason: "expired",
    message: "This QR ticket has expired.",
  });

  expect(verifyQrTicket).toHaveBeenCalledWith("expired-ticket", { expectedEventId: "event-id" });
  expect(findFirst).not.toHaveBeenCalled();
});

test("returns a wrong-event reason without looking up a roster entry", async () => {
  verifyQrTicket.mockReturnValue({
    valid: false,
    reason: "wrong_event",
    message: "This QR ticket belongs to a different event.",
  });

  await expect(
    recordCheckIn({ eventId: "event-id", ticketTokenOrCode: "other-event-ticket", adminId: "admin-id" }),
  ).resolves.toEqual({
    status: "invalid",
    reason: "wrong_event",
    message: "This QR ticket belongs to a different event.",
  });

  expect(findFirst).not.toHaveBeenCalled();
});

test("falls back to a student ID only when the input is not a QR ticket", async () => {
  verifyQrTicket.mockReturnValue({
    valid: false,
    reason: "malformed",
    message: "This is not a valid QR ticket.",
  });
  findFirst.mockResolvedValue(null);

  await expect(
    recordCheckIn({ eventId: "event-id", ticketTokenOrCode: "student-id", adminId: "admin-id" }),
  ).resolves.toEqual({
    status: "invalid",
    reason: "malformed",
    message: "This is not a valid QR ticket.",
  });

  expect(findFirst).toHaveBeenCalledWith({
    where: {
      eventId: "event-id",
      attendee: { deletedAt: null },
      OR: [{ id: "student-id" }, { attendee: { studentId: "student-id" } }],
    },
    select: { id: true },
  });
});

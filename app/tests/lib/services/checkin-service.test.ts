import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { updateMany, findFirst, findUnique, transaction, verifyQrTicket } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  verifyQrTicket: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    $transaction: transaction,
    eventRosterEntry: { findFirst, findUnique },
  }),
}));

vi.mock("@/lib/security/qr-signer", () => ({ verifyQrTicket }));

import { checkInRosterEntry, recordCheckIn } from "@/lib/services/checkin-service";

beforeEach(() => {
  transaction.mockImplementation((callback) => callback({ eventRosterEntry: { updateMany, findUnique } }));
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
  ).resolves.toEqual({ status: "checked_in", arrivedAt });

  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "entry-id", eventId: "event-id", status: "PENDING" },
    data: { status: "ATTENDED", arrivedAt, scannedByAdminId: "admin-id" },
  });
  expect(findUnique).not.toHaveBeenCalled();
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

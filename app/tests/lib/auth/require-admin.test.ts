import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { findFirst, getNeonAuth, getPrismaClient } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getNeonAuth: vi.fn(),
  getPrismaClient: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getNeonAuth }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import { requireAdmin } from "@/lib/auth/require-admin";
import { createFakeNeonAuth, fakeAdminSession, fakeNonAdminSession } from "@/tests/fakes";

beforeEach(() => {
  vi.stubEnv("ORGANIZATION_TIMEZONE", "Asia/Manila");
  getPrismaClient.mockReturnValue({ allowlistEntry: { findFirst } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

test("rejects requests without an authenticated session", async () => {
  getNeonAuth.mockReturnValue(createFakeNeonAuth(null));

  const result = await requireAdmin();

  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(401);
  expect(findFirst).not.toHaveBeenCalled();
});

test("rejects signed-in users without an active allowlist entry", async () => {
  getNeonAuth.mockReturnValue(createFakeNeonAuth(fakeNonAdminSession()));
  findFirst.mockResolvedValue(null);

  const result = await requireAdmin();

  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(403);
});

test("looks up only entries that are not removed and have not ended", async () => {
  // 23:30 on 21 Nov in Manila is still 21 Nov there, but already 15:30 UTC.
  vi.useFakeTimers({ now: new Date("2026-11-21T15:30:00.000Z"), toFake: ["Date"] });
  getNeonAuth.mockReturnValue(createFakeNeonAuth(fakeNonAdminSession()));
  findFirst.mockResolvedValue(null);

  await requireAdmin();

  expect(findFirst).toHaveBeenCalledWith({
    where: {
      neonAuthUserId: "user-id",
      removedAt: null,
      OR: [
        { accessEndsOn: null },
        { accessEndsOn: { gte: new Date("2026-11-21T00:00:00.000Z") } },
      ],
    },
    select: { neonAuthUserId: true },
  });
});

test("uses the organization's day once it has rolled over before UTC", async () => {
  // 00:30 on 22 Nov in Manila is still 21 Nov in UTC, so an entry ending
  // on 21 Nov has expired.
  vi.useFakeTimers({ now: new Date("2026-11-21T16:30:00.000Z"), toFake: ["Date"] });
  getNeonAuth.mockReturnValue(createFakeNeonAuth(fakeNonAdminSession()));
  findFirst.mockResolvedValue(null);

  await requireAdmin();

  expect(findFirst.mock.calls[0][0].where.OR[1]).toEqual({
    accessEndsOn: { gte: new Date("2026-11-22T00:00:00.000Z") },
  });
});

test("returns the allowlisted user ID", async () => {
  getNeonAuth.mockReturnValue(createFakeNeonAuth(fakeAdminSession()));
  findFirst.mockResolvedValue({ neonAuthUserId: "admin-id" });

  await expect(requireAdmin()).resolves.toEqual({ adminId: "admin-id" });
});

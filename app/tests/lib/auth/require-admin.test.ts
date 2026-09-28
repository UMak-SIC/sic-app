import { afterEach, expect, test, vi } from "vitest";

const { findUnique, getNeonAuth, getPrismaClient } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getNeonAuth: vi.fn(),
  getPrismaClient: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getNeonAuth }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient }));

import { requireAdmin } from "@/lib/auth/require-admin";

afterEach(() => {
  vi.resetAllMocks();
  getPrismaClient.mockReturnValue({ admin: { findUnique } });
});

test("rejects requests without an authenticated session", async () => {
  getNeonAuth.mockReturnValue({ getSession: vi.fn().mockResolvedValue({ data: null }) });

  const result = await requireAdmin();

  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(401);
  expect(findUnique).not.toHaveBeenCalled();
});

test("rejects authenticated users who are not administrators", async () => {
  getNeonAuth.mockReturnValue({
    getSession: vi.fn().mockResolvedValue({ data: { user: { id: "user-id" } } }),
  });
  findUnique.mockResolvedValue(null);

  const result = await requireAdmin();

  expect(result).toBeInstanceOf(Response);
  expect((result as Response).status).toBe(403);
  expect(findUnique).toHaveBeenCalledWith({
    where: { neonAuthUserId: "user-id" },
    select: { neonAuthUserId: true },
  });
});

test("returns the allowlisted administrator ID", async () => {
  getNeonAuth.mockReturnValue({
    getSession: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
  });
  findUnique.mockResolvedValue({ neonAuthUserId: "admin-id" });

  await expect(requireAdmin()).resolves.toEqual({ adminId: "admin-id" });
});

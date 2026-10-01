import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

const { findMany, updateMany, upsert, transaction } = vi.hoisted(() => {
  const findMany = vi.fn();
  const updateMany = vi.fn();

  return {
    findMany,
    updateMany,
    upsert: vi.fn(),
    // Mirrors Prisma's callback form: the handler receives the transaction client,
    // so the mocked models are reached as `tx.providerDailyUsage.*`.
    transaction: vi.fn(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({
        providerDailyUsage: { findMany, updateMany, upsert },
      })
    ),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ providerDailyUsage: { findMany, updateMany, upsert }, $transaction: transaction }),
}));

import {
  confirmProviderSend,
  getDailyLimit,
  getUsageDate,
  hasProviderCapacity,
  PROVIDER_PREFERENCE,
  releaseProviderReservation,
  reserveProviderSlot,
} from "@/lib/queue/quota-manager";

const usageDate = new Date("2026-09-30T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ORGANIZATION_TIMEZONE = "Asia/Manila";
  updateMany.mockResolvedValue({ count: 1 });
  upsert.mockResolvedValue({});
  findMany.mockResolvedValue([]);
});

afterEach(() => {
  delete process.env.ORGANIZATION_TIMEZONE;
});

describe("limits are configurable", () => {
  test("defaults to the documented allowance", () => {
    expect(getDailyLimit(EmailProvider.BREVO, {})).toBe(300);
  });

  test("reads the configured value", () => {
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "25" })).toBe(25);
  });

  test("falls back to the default rather than failing delivery on a bad value", () => {
    // A typo in a quota variable should not stop the day's email.
    for (const bad of ["", "   ", "abc", "-5", "1.5"]) {
      expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: bad })).toBe(300);
    }
  });

  test("treats an implausibly large value as a typo, not as unlimited", () => {
    // 1e21 is a valid integer, so without a bound a digit slip would silently
    // disable the cap that protects the delivery queue.
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "1e21" })).toBe(300);
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "1000000000000000000000" })).toBe(300);
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "1000001" })).toBe(300);
  });

  test("accepts a large but plausible allowance", () => {
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "1000000" })).toBe(1_000_000);
  });

  test("tolerates surrounding whitespace", () => {
    expect(getDailyLimit(EmailProvider.BREVO, { BREVO_DAILY_LIMIT: "  40 " })).toBe(40);
  });
});

describe("the quota day is the organization's calendar day", () => {
  test("uses Manila local midnight, not UTC", () => {
    // 2026-09-30T18:00Z is already 2026-10-01 02:00 in Manila.
    const date = getUsageDate(new Date("2026-09-30T18:00:00.000Z"));

    expect(date.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  test("keeps a time inside the same Manila day on the same usage date", () => {
    const morning = getUsageDate(new Date("2026-09-30T02:00:00.000Z"));
    const evening = getUsageDate(new Date("2026-09-30T10:00:00.000Z"));

    expect(morning.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(evening.toISOString()).toBe(morning.toISOString());
  });
});

describe("reserving a slot", () => {
  test("takes Brevo first", async () => {
    await expect(reserveProviderSlot({ now: new Date("2026-09-30T02:00:00.000Z") })).resolves.toBe(
      EmailProvider.BREVO
    );
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  test("guards the update on the limit so the cap is transactional", async () => {
    await reserveProviderSlot({ now: new Date("2026-09-30T02:00:00.000Z") });

    // A read-then-write would let two workers both pass the 100th slot; the
    // predicate is re-evaluated under the row lock by Postgres.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reservedCount: { lt: 100 } }),
        data: { reservedCount: { increment: 1 } },
      })
    );
  });

  test("returns null when the quota is exhausted, so the job is held", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      reserveProviderSlot({ env: {}, now: new Date("2026-09-30T02:00:00.000Z") })
    ).resolves.toBeNull();
  });

  test("returns null when the provider is disabled", async () => {
    await expect(reserveProviderSlot({
      env: { BREVO_DAILY_LIMIT: "0" },
      now: new Date("2026-09-30T02:00:00.000Z"),
    })).resolves.toBeNull();
    // The disabled provider is never even upserted into the day's usage.
    expect(upsert).not.toHaveBeenCalled();
  });

  test("honours a caller-supplied order", async () => {
    await expect(
      reserveProviderSlot({ order: [EmailProvider.BREVO], now: new Date("2026-09-30T02:00:00.000Z") })
    ).resolves.toBe(EmailProvider.BREVO);
  });

  test("creates the day's row before guarding on it", async () => {
    await reserveProviderSlot({ now: new Date("2026-09-30T02:00:00.000Z") });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { provider: EmailProvider.BREVO, usageDate } })
    );
  });

  test("preference order contains only Brevo", () => {
    expect(PROVIDER_PREFERENCE).toEqual([EmailProvider.BREVO]);
  });
});

describe("settling a reservation", () => {
  test("confirming counts the send but keeps the slot consumed", async () => {
    await confirmProviderSend({ provider: EmailProvider.BREVO, now: new Date("2026-09-30T02:00:00.000Z") });

    // Only sentCount moves. Returning the slot here would hand the same daily
    // allowance out repeatedly.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sentCount: { increment: 1 } } })
    );
  });

  test("releasing returns the slot so a failed send does not consume quota", async () => {
    await releaseProviderReservation({ provider: EmailProvider.BREVO, now: new Date("2026-09-30T02:00:00.000Z") });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { reservedCount: { decrement: 1 } } })
    );
  });

  test("a double release cannot drive the counter negative", async () => {
    await releaseProviderReservation({ provider: EmailProvider.BREVO, now: new Date("2026-09-30T02:00:00.000Z") });

    // Going negative would grant more than the provider's allowance.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reservedCount: { gt: 0 } }) })
    );
  });
});

describe("the pre-flight capacity check", () => {
  test("is true when no usage rows exist yet", async () => {
    await expect(hasProviderCapacity({ now: new Date("2026-09-30T02:00:00.000Z") })).resolves.toBe(true);
  });

  test("is true while Brevo has room", async () => {
    findMany.mockResolvedValue([
      { provider: EmailProvider.BREVO, reservedCount: 0 },
    ]);

    await expect(hasProviderCapacity({ now: new Date("2026-09-30T02:00:00.000Z") })).resolves.toBe(true);
  });

  test("is false when Brevo is full", async () => {
    findMany.mockResolvedValue([
      { provider: EmailProvider.BREVO, reservedCount: 300 },
    ]);

    await expect(hasProviderCapacity({ now: new Date("2026-09-30T02:00:00.000Z") })).resolves.toBe(false);
  });

  test("is false when the limit is zero", async () => {
    await expect(
      hasProviderCapacity({
        env: { BREVO_DAILY_LIMIT: "0" },
        now: new Date("2026-09-30T02:00:00.000Z"),
      })
    ).resolves.toBe(false);
    // Nothing to check, so nothing is read.
    expect(findMany).not.toHaveBeenCalled();
  });
});

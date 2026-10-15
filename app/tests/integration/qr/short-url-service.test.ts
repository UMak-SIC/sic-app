import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { expect, test } from "vitest";

import { getTestDatabase, hasTestDatabase, seedTestDatabase } from "@/tests/setup";

const adminId = "admin-short-url-test";

async function seedAdmin(): Promise<void> {
  await seedTestDatabase(async (database) => {
    await database.admin.create({ data: { neonAuthUserId: adminId } });
  });
}

test.skipIf(!hasTestDatabase())("enforces the short-link persistence contract", async () => {
  await seedAdmin();
  const database = getTestDatabase();
  const activeId = randomUUID();

  await database.shortUrl.create({
    data: {
      id: activeId,
      code: "AbCdEfG",
      name: "Active link",
      destination: "https://example.test/active",
      createdById: adminId,
    },
  });
  await database.shortUrl.create({
    data: {
      code: "HiJkLmN",
      name: "Disabled link",
      destination: "https://example.test/disabled",
      status: "DISABLED",
      createdById: adminId,
    },
  });
  await database.shortUrl.create({
    data: {
      code: "OpQrStU",
      name: "Expired link",
      destination: "https://example.test/expired",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      createdById: adminId,
    },
  });
  await expect(database.shortUrl.create({
    data: {
      code: "aBcDeFg",
      destination: "https://example.test/case-variant",
      createdById: adminId,
    },
  })).resolves.toMatchObject({ code: "aBcDeFg" });

  await expect(database.shortUrl.create({
    data: {
      code: "AbCdEfG",
      destination: "https://example.test/duplicate",
      createdById: adminId,
    },
  })).rejects.toMatchObject({ code: "P2002" });
  await expect(database.shortUrl.create({
    data: {
      code: "invalid",
      destination: "https://example.test/invalid-code",
      createdById: adminId,
    },
  })).rejects.toThrow();
  await expect(database.shortUrl.create({
    data: {
      code: "VwXyZaB",
      destination: "http://example.test/not-https",
      createdById: adminId,
    },
  })).rejects.toThrow();
  await expect(database.shortUrl.create({
    data: {
      code: "CdEfGhI",
      destination: "https://example.test/negative-count",
      viewCount: BigInt(-1),
      createdById: adminId,
    },
  })).rejects.toThrow();
});

test.skipIf(!hasTestDatabase())("resolves an active short link exactly once and records one visit", async () => {
  await seedAdmin();
  const database = getTestDatabase();
  const activeUrl = await database.shortUrl.create({
    data: {
      code: "AbCdEfG",
      destination: "https://example.test/destination",
      createdById: adminId,
    },
  });
  const disabledUrl = await database.shortUrl.create({
    data: {
      code: "HiJkLmN",
      destination: "https://example.test/disabled",
      status: "DISABLED",
      createdById: adminId,
    },
  });
  const expiredUrl = await database.shortUrl.create({
    data: {
      code: "OpQrStU",
      destination: "https://example.test/expired",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      createdById: adminId,
    },
  });

  async function resolveCode(code: string): Promise<Array<{ destination: string }>> {
    return database.$queryRaw<Array<{ destination: string }>>(Prisma.sql`
      WITH resolved AS (
        UPDATE "short_urls"
        SET "view_count" = "view_count" + 1
        WHERE "code" = ${code}
          AND "status" = 'active'::"ShortUrlStatus"
          AND ("expires_at" IS NULL OR "expires_at" > now())
        RETURNING "id", "destination"
      ), tracked AS (
        INSERT INTO "short_url_visits" ("short_url_id")
        SELECT "id" FROM resolved
      )
      SELECT "destination" FROM resolved
    `);
  }

  const resolved = await resolveCode(activeUrl.code);

  expect(resolved).toEqual([{ destination: "https://example.test/destination" }]);
  await expect(database.shortUrl.findUniqueOrThrow({ where: { id: activeUrl.id } }))
    .resolves.toMatchObject({ viewCount: BigInt(1) });
  await expect(database.shortUrlVisit.count({ where: { shortUrlId: activeUrl.id } }))
    .resolves.toBe(1);

  await expect(resolveCode(disabledUrl.code)).resolves.toEqual([]);
  await expect(resolveCode(expiredUrl.code)).resolves.toEqual([]);
  await expect(database.shortUrl.findUniqueOrThrow({ where: { id: disabledUrl.id } }))
    .resolves.toMatchObject({ viewCount: BigInt(0) });
  await expect(database.shortUrl.findUniqueOrThrow({ where: { id: expiredUrl.id } }))
    .resolves.toMatchObject({ viewCount: BigInt(0) });
  await expect(database.shortUrlVisit.count()).resolves.toBe(1);
});

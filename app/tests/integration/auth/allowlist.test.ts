import { describe, expect, test } from "vitest";

import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

// DMA-01: the rules allowlist_entries enforces in the database, not only in app code.
describeWithDatabase("allowlist_entries", () => {
  test("keeps emails and linked users unique", async () => {
    const db = getTestDatabase();
    await db.allowlistEntry.create({
      data: { normalizedEmail: "head@umak.edu.ph", neonAuthUserId: "user-1", role: "EVENT_HEAD" },
    });

    await expect(
      db.allowlistEntry.create({ data: { normalizedEmail: "head@umak.edu.ph", role: "EVENT_HEAD" } }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      db.allowlistEntry.create({ data: { neonAuthUserId: "user-1", role: "EVENT_HEAD" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  test("stores emails only in normalized form", async () => {
    const db = getTestDatabase();

    await expect(
      db.allowlistEntry.create({ data: { normalizedEmail: " Head@UMak.edu.ph", role: "EVENT_HEAD" } }),
    ).rejects.toThrow();
  });

  test("requires an email or a linked user", async () => {
    const db = getTestDatabase();

    await expect(db.allowlistEntry.create({ data: { role: "EVENT_HEAD" } })).rejects.toThrow();
  });

  test("requires an end date for Executive Committee and Committee entries", async () => {
    const db = getTestDatabase();

    await expect(
      db.allowlistEntry.create({ data: { normalizedEmail: "exec@umak.edu.ph", role: "EXECUTIVE" } }),
    ).rejects.toThrow();
    await expect(
      db.allowlistEntry.create({ data: { normalizedEmail: "member@umak.edu.ph", role: "COMMITTEE" } }),
    ).rejects.toThrow();

    await expect(
      db.allowlistEntry.create({
        data: {
          normalizedEmail: "exec@umak.edu.ph",
          role: "EXECUTIVE",
          accessEndsOn: new Date("2027-05-31T00:00:00.000Z"),
        },
      }),
    ).resolves.toMatchObject({ role: "EXECUTIVE" });
    await expect(
      db.allowlistEntry.create({ data: { normalizedEmail: "head@umak.edu.ph", role: "EVENT_HEAD" } }),
    ).resolves.toMatchObject({ accessEndsOn: null });
  });

  test("refuses to remove, delete or demote the last System Administrator", async () => {
    const db = getTestDatabase();
    const only = await db.allowlistEntry.create({
      data: { neonAuthUserId: "admin-1", role: "SYSTEM_ADMIN" },
    });

    await expect(
      db.allowlistEntry.update({ where: { id: only.id }, data: { removedAt: new Date() } }),
    ).rejects.toThrow(/last System Administrator/);
    await expect(
      db.allowlistEntry.update({ where: { id: only.id }, data: { role: "EVENT_HEAD" } }),
    ).rejects.toThrow(/last System Administrator/);
    await expect(db.allowlistEntry.delete({ where: { id: only.id } })).rejects.toThrow(
      /last System Administrator/,
    );

    await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-2", role: "SYSTEM_ADMIN" } });

    await expect(
      db.allowlistEntry.update({ where: { id: only.id }, data: { removedAt: new Date() } }),
    ).resolves.toMatchObject({ id: only.id });
  });

  test("lets allowlisted users keep creating records under their user ID", async () => {
    const db = getTestDatabase();
    await db.allowlistEntry.create({
      data: { normalizedEmail: "head@umak.edu.ph", neonAuthUserId: "head-id", role: "EVENT_HEAD" },
    });

    await expect(
      db.event.create({
        data: {
          name: "Orientation",
          details: "Details",
          startsAt: new Date("2026-12-01T01:00:00.000Z"),
          endsAt: new Date("2026-12-01T03:00:00.000Z"),
          createdById: "head-id",
        },
      }),
    ).resolves.toMatchObject({ createdById: "head-id" });
    await expect(
      db.event.create({
        data: {
          name: "Stranger's event",
          details: "Details",
          startsAt: new Date("2026-12-01T01:00:00.000Z"),
          endsAt: new Date("2026-12-01T03:00:00.000Z"),
          createdById: "not-on-the-allowlist",
        },
      }),
    ).rejects.toThrow();
  });

  test("lets the attendee search run only for active entries", async () => {
    const db = getTestDatabase();
    await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-1", role: "SYSTEM_ADMIN" } });
    await db.allowlistEntry.create({
      data: { neonAuthUserId: "former-admin", role: "SYSTEM_ADMIN", removedAt: new Date() },
    });

    await expect(
      db.$queryRaw`SELECT * FROM public.search_global_attendees(${"admin-1"}::text)`,
    ).resolves.toEqual([]);
    await expect(
      db.$queryRaw`SELECT * FROM public.search_global_attendees(${"former-admin"}::text)`,
    ).rejects.toThrow(/Administrator access is required/);
  });
});

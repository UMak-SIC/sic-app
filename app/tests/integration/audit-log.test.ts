import { describe, expect, test } from "vitest";

import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

// DMA-14: audit entries are read-only for everyone except the retention job.
describeWithDatabase("audit_log", () => {
  test("records entries and refuses to change or delete them", async () => {
    const db = getTestDatabase();
    const entry = await db.auditLog.create({
      data: {
        actorEmail: "admin@umak.edu.ph",
        action: "allowlist.add",
        targetType: "allowlist_entry",
        targetId: "entry-id",
        summary: { after: { role: "event_head" } },
      },
    });

    await expect(
      db.auditLog.update({ where: { id: entry.id }, data: { action: "allowlist.remove" } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow(/append-only/);
    await expect(db.auditLog.count()).resolves.toBe(1);
  });

  test("lets the retention job delete entries inside its own transaction", async () => {
    const db = getTestDatabase();
    await db.auditLog.create({ data: { actorEmail: "admin@umak.edu.ph", action: "event.close" } });

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL app.audit_retention = 'on'`;
      await tx.auditLog.deleteMany({});
    });

    await expect(db.auditLog.count()).resolves.toBe(0);

    // The opt-in ended with that transaction.
    const later = await db.auditLog.create({
      data: { actorEmail: "admin@umak.edu.ph", action: "event.close" },
    });
    await expect(db.auditLog.delete({ where: { id: later.id } })).rejects.toThrow(/append-only/);
  });
});

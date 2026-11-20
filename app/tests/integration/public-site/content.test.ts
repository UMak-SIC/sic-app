import { describe, expect, test } from "vitest";

import { runRetention } from "@/lib/services/retention-service";
import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

async function seedAdminAndLogo(uploadedAt?: Date) {
  const db = getTestDatabase();
  await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
  return db.asset.create({
    data: {
      objectKey: "assets/logo.webp",
      storageBucket: "PUBLIC_IMAGES",
      originalFilename: "logo.png",
      mediaType: "image/webp",
      byteSize: BigInt(2048),
      uploadedById: "admin-id",
      ...(uploadedAt ? { uploadedAt } : {}),
    },
  });
}

// DMA-15 to DMA-22: rules the public site content tables enforce in the database.
describeWithDatabase("public site content", () => {
  test("keeps a single site content row", async () => {
    const db = getTestDatabase();
    await db.siteContent.create({ data: { homeStatement: "We are SIC." } });

    await expect(db.siteContent.create({ data: { homeStatement: "Again" } })).rejects.toMatchObject({
      code: "P2002",
    });
    await expect(
      db.$executeRaw`INSERT INTO site_content (id, singleton, updated_at) VALUES (gen_random_uuid(), false, now())`,
    ).rejects.toThrow();
  });

  test("removes members together with their committee", async () => {
    const db = getTestDatabase();
    const committee = await db.committee.create({
      data: {
        name: "Development Team",
        members: { create: [{ fullName: "Juan Dela Cruz", role: "Lead Developer" }] },
      },
    });

    await expect(db.committee.create({ data: { name: "Development Team" } })).rejects.toMatchObject({
      code: "P2002",
    });

    await db.committee.delete({ where: { id: committee.id } });
    await expect(db.committeeMember.count()).resolves.toBe(0);
  });

  test("allows at most five featured FAQs", async () => {
    const db = getTestDatabase();
    const featured = [];
    for (let index = 0; index < 5; index += 1) {
      featured.push(
        await db.faq.create({
          data: { question: `Question ${index}`, answer: "Answer", isFeatured: true, sortOrder: index },
        }),
      );
    }

    await expect(
      db.faq.create({ data: { question: "Sixth", answer: "Answer", isFeatured: true } }),
    ).rejects.toThrow(/Only five FAQs/);

    const sixth = await db.faq.create({ data: { question: "Sixth", answer: "Answer" } });
    await expect(
      db.faq.update({ where: { id: sixth.id }, data: { isFeatured: true } }),
    ).rejects.toThrow(/Only five FAQs/);

    await db.faq.update({ where: { id: featured[0].id }, data: { isFeatured: false } });
    await expect(
      db.faq.update({ where: { id: sixth.id }, data: { isFeatured: true } }),
    ).resolves.toMatchObject({ isFeatured: true });

    // Editing a featured FAQ while five are featured is not a sixth.
    await expect(
      db.faq.update({ where: { id: featured[1].id }, data: { answer: "Updated answer" } }),
    ).resolves.toMatchObject({ answer: "Updated answer" });
  });

  test("requires a publish time on published news posts", async () => {
    const db = getTestDatabase();
    await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
    const base = {
      title: "General assembly",
      postDate: new Date("2026-11-21T00:00:00.000Z"),
      bodyMarkdown: "See you there.",
      createdById: "admin-id",
    };

    await expect(db.newsPost.create({ data: base })).resolves.toMatchObject({ status: "DRAFT" });
    await expect(db.newsPost.create({ data: { ...base, status: "PUBLISHED" } })).rejects.toThrow();
    await expect(
      db.newsPost.create({ data: { ...base, status: "PUBLISHED", publishedAt: new Date() } }),
    ).resolves.toMatchObject({ status: "PUBLISHED" });
  });

  test("accepts only https sponsor links and keeps logos in use", async () => {
    const db = getTestDatabase();
    const logo = await seedAdminAndLogo();

    await expect(
      db.sponsor.create({ data: { name: "Acme", logoAssetId: logo.id, linkUrl: "http://acme.test" } }),
    ).rejects.toThrow();
    await expect(
      db.sponsor.create({ data: { name: "Acme", logoAssetId: logo.id, linkUrl: "https://acme.test" } }),
    ).resolves.toMatchObject({ name: "Acme" });
    await expect(
      db.sponsor.create({ data: { name: "No link", logoAssetId: logo.id } }),
    ).resolves.toMatchObject({ linkUrl: null });

    await expect(db.asset.delete({ where: { id: logo.id } })).rejects.toThrow();
  });

  test("checks achievement years", async () => {
    const db = getTestDatabase();

    await expect(
      db.achievement.create({ data: { title: "Best Org", year: 2025, description: "Awarded." } }),
    ).resolves.toMatchObject({ year: 2025 });
    await expect(
      db.achievement.create({ data: { title: "Typo", year: 205, description: "Wrong year." } }),
    ).rejects.toThrow();
  });

  test("never deletes an old file that the public site still uses", async () => {
    const db = getTestDatabase();
    const logo = await seedAdminAndLogo(new Date("2020-01-01T00:00:00.000Z"));
    await db.sponsor.create({ data: { name: "Acme", logoAssetId: logo.id } });

    await expect(
      runRetention(new Date("2030-01-01T00:00:00.000Z"), {
        getNeonStorageClient: () => {
          throw new Error("No file deletion expected.");
        },
        prisma: db,
      }),
    ).resolves.toMatchObject({ assetDeletionFailures: 0, deletedAssets: 0 });
    await expect(db.asset.findUnique({ where: { id: logo.id } })).resolves.not.toBeNull();
  });
});

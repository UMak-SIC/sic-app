import { describe, expect, test } from "vitest";

import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;

async function seedEventAndAssets() {
  const db = getTestDatabase();
  await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
  const event = await db.event.create({
    data: {
      name: "Hackathon",
      details: "Details",
      startsAt: new Date("2026-10-01T01:00:00.000Z"),
      endsAt: new Date("2026-10-01T09:00:00.000Z"),
      status: "CLOSED",
      createdById: "admin-id",
    },
  });
  const [photo, video] = await Promise.all(
    ["photo", "video"].map((name) =>
      db.asset.create({
        data: {
          objectKey: `assets/${name}`,
          storageBucket: "PUBLIC_IMAGES",
          originalFilename: name,
          mediaType: name === "photo" ? "image/webp" : "video/mp4",
          byteSize: BigInt(1024),
          uploadedById: "admin-id",
        },
      }),
    ),
  );
  return { db, event, photo, video };
}

// DMA-03, DMA-24, DMA-25: event theme, registration link, SDE videos and photos.
describeWithDatabase("event media", () => {
  test("accepts only https registration links", async () => {
    const { db, event } = await seedEventAndAssets();

    await expect(
      db.event.update({ where: { id: event.id }, data: { registrationLink: "http://forms.test/x" } }),
    ).rejects.toThrow();
    await expect(
      db.event.update({
        where: { id: event.id },
        data: { theme: "Build for the community", registrationLink: "https://forms.test/x" },
      }),
    ).resolves.toMatchObject({ theme: "Build for the community" });
  });

  test("requires exactly one source per SDE video", async () => {
    const { db, event, video } = await seedEventAndAssets();

    await expect(db.eventSdeVideo.create({ data: { eventId: event.id } })).rejects.toThrow();
    await expect(
      db.eventSdeVideo.create({
        data: { eventId: event.id, videoUrl: "https://youtu.be/abc", assetId: video.id },
      }),
    ).rejects.toThrow();
    await expect(
      db.eventSdeVideo.create({ data: { eventId: event.id, videoUrl: "http://youtu.be/abc" } }),
    ).rejects.toThrow();

    await expect(
      db.eventSdeVideo.create({ data: { eventId: event.id, videoUrl: "https://youtu.be/abc" } }),
    ).resolves.toMatchObject({ assetId: null });
    await expect(
      db.eventSdeVideo.create({ data: { eventId: event.id, assetId: video.id, title: "Highlights" } }),
    ).resolves.toMatchObject({ videoUrl: null });
  });

  test("requires alt text and allows one cover photo per event", async () => {
    const { db, event, photo } = await seedEventAndAssets();
    const base = { eventId: event.id, assetId: photo.id, uploadedById: "admin-id" };

    await expect(db.eventPhoto.create({ data: { ...base, altText: "   " } })).rejects.toThrow();

    const cover = await db.eventPhoto.create({
      data: { ...base, altText: "Teams presenting", isCover: true },
    });
    const second = await db.eventPhoto.create({ data: { ...base, altText: "Awarding" } });

    await expect(
      db.eventPhoto.update({ where: { id: second.id }, data: { isCover: true } }),
    ).rejects.toThrow(/only one cover photo/);

    await db.eventPhoto.update({ where: { id: cover.id }, data: { isCover: false } });
    await expect(
      db.eventPhoto.update({ where: { id: second.id }, data: { isCover: true } }),
    ).resolves.toMatchObject({ isCover: true });
  });

  test("removes videos and photos with their event but keeps the files", async () => {
    const { db, event, photo, video } = await seedEventAndAssets();
    await db.eventSdeVideo.create({ data: { eventId: event.id, assetId: video.id } });
    await db.eventPhoto.create({
      data: { eventId: event.id, assetId: photo.id, altText: "Group photo", uploadedById: "admin-id" },
    });

    await expect(db.asset.delete({ where: { id: photo.id } })).rejects.toThrow();

    await db.event.delete({ where: { id: event.id } });
    await expect(db.eventSdeVideo.count()).resolves.toBe(0);
    await expect(db.eventPhoto.count()).resolves.toBe(0);
    await expect(db.asset.count()).resolves.toBe(2);
  });
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getPublishedNewsPost,
  getSiteContent,
  listFaqs,
  listPublishedNews,
  listResourcesByType,
} from "@/lib/public-site/content";
import {
  getNextEvent,
  getPublicEvent,
  listEventsStartingBetween,
  listPastEvents,
  listUpcomingEvents,
} from "@/lib/public-site/events";
import { getTestDatabase, hasTestDatabase } from "@/tests/setup";

const describeWithDatabase = hasTestDatabase() ? describe : describe.skip;
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

const NOW = new Date("2026-12-01T04:00:00.000Z");
const hours = (n: number) => new Date(NOW.getTime() + n * 3_600_000);

async function seedEvents() {
  const db = getTestDatabase();
  await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
  const make = (name: string, status: "DRAFT" | "PUBLISHED" | "CLOSED", start: number, end: number) =>
    db.event.create({
      data: {
        name,
        details: `${name} details`,
        status,
        startsAt: hours(start),
        endsAt: hours(end),
        createdById: "admin-id",
      },
    });
  return {
    draft: await make("Draft Summit", "DRAFT", 24, 26),
    soon: await make("Orientation", "PUBLISHED", 24, 26),
    later: await make("Hackathon", "PUBLISHED", 72, 80),
    ongoing: await make("Workshop", "PUBLISHED", -1, 1),
    endedPublished: await make("Talk", "PUBLISHED", -30, -28),
    closed: await make("General Assembly", "CLOSED", -200, -196),
  };
}

// Every public read: drafts never appear, and an event moves to Past at its end.
describeWithDatabase("public site reads", () => {
  test("never return draft events from any list or detail", async () => {
    const events = await seedEvents();

    const upcoming = await listUpcomingEvents(NOW);
    const past = await listPastEvents(NOW, 1, 20);
    const month = await listEventsStartingBetween(hours(-1000), hours(1000));
    const names = [...upcoming, ...past.events, ...month].map((event) => event.name);

    expect(names).not.toContain("Draft Summit");
    await expect(getPublicEvent(events.draft.id, NOW)).resolves.toBeNull();
    await expect(getPublicEvent("not-a-uuid", NOW)).resolves.toBeNull();
  });

  test("splits upcoming and past at the end time", async () => {
    await seedEvents();

    await expect(getNextEvent(NOW)).resolves.toMatchObject({ name: "Workshop" });
    expect((await listUpcomingEvents(NOW)).map((event) => event.name)).toEqual([
      "Workshop",
      "Orientation",
      "Hackathon",
    ]);

    const past = await listPastEvents(NOW, 1, 1);
    expect(past.total).toBe(2);
    expect(past.events.map((event) => event.name)).toEqual(["Talk"]);
    expect((await listPastEvents(NOW, 2, 1)).events.map((event) => event.name)).toEqual([
      "General Assembly",
    ]);
  });

  test("shows SDE videos and photos for past events only", async () => {
    const events = await seedEvents();
    const db = getTestDatabase();
    for (const event of [events.soon, events.closed]) {
      await db.eventSdeVideo.create({
        data: { eventId: event.id, videoUrl: "https://youtu.be/dQw4w9WgXcQ", title: "Highlights" },
      });
    }

    const upcoming = await getPublicEvent(events.soon.id, NOW);
    expect(upcoming).toMatchObject({ isPast: false, sdeVideos: [], photos: [] });

    const past = await getPublicEvent(events.closed.id, NOW);
    expect(past?.isPast).toBe(true);
    expect(past?.sdeVideos).toEqual([
      expect.objectContaining({
        title: "Highlights",
        link: expect.objectContaining({ platform: "YouTube" }),
      }),
    ]);
    expect((await listPastEvents(NOW, 1, 20)).events.find((e) => e.name === "General Assembly"))
      .toMatchObject({ hasSdeVideo: true });
  });

  test("lists only published news, newest first, a page at a time", async () => {
    const db = getTestDatabase();
    await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
    const post = (title: string, day: number, published: boolean) =>
      db.newsPost.create({
        data: {
          title,
          postDate: new Date(Date.UTC(2026, 10, day)),
          bodyMarkdown: `**${title}**`,
          createdById: "admin-id",
          ...(published ? { status: "PUBLISHED" as const, publishedAt: NOW } : {}),
        },
      });
    const draft = await post("Draft notice", 30, false);
    await post("Older", 2, true);
    await post("Newer", 20, true);

    const first = await listPublishedNews(1, 1);
    expect(first.total).toBe(2);
    expect(first.posts.map((p) => p.title)).toEqual(["Newer"]);
    expect((await listPublishedNews(2, 1)).posts.map((p) => p.title)).toEqual(["Older"]);
    await expect(getPublishedNewsPost(draft.id)).resolves.toBeNull();

    const newer = (await listPublishedNews(1, 1)).posts[0];
    await expect(getPublishedNewsPost(newer.id)).resolves.toMatchObject({
      bodyHtml: expect.stringContaining("<strong>Newer</strong>"),
    });
  });

  test("orders FAQs, limits Home to featured ones and groups resources by type", async () => {
    const db = getTestDatabase();
    await db.faq.createMany({
      data: [
        { question: "Second?", answer: "Yes.", sortOrder: 2, isFeatured: true },
        { question: "First?", answer: "Yes.", sortOrder: 1 },
      ],
    });

    expect((await listFaqs({ featuredOnly: false })).map((faq) => faq.question)).toEqual([
      "First?",
      "Second?",
    ]);
    expect((await listFaqs({ featuredOnly: true })).map((faq) => faq.question)).toEqual(["Second?"]);

    await db.allowlistEntry.create({ data: { neonAuthUserId: "admin-id", role: "SYSTEM_ADMIN" } });
    const file = await db.asset.create({
      data: {
        objectKey: "assets/form.pdf",
        storageBucket: "PRIVATE_IMAGES",
        originalFilename: "membership-form.pdf",
        mediaType: "application/pdf",
        byteSize: BigInt(2048),
        uploadedById: "admin-id",
      },
    });
    await db.resource.create({ data: { title: "Membership form", type: "FORM", fileAssetId: file.id } });

    const groups = await listResourcesByType();
    expect(groups.map((group) => group.type)).toEqual(["FORM", "BYLAW", "REPORT"]);
    // A file that is not in public storage has no download link, so the page
    // shows "not available" instead of a broken link (PS-09.4).
    expect(groups[0].files).toEqual([
      expect.objectContaining({ fileName: "membership-form.pdf", fileType: "PDF", url: null }),
    ]);
  });

  test("reads site content when the layout and the page ask at the same time", async () => {
    const db = getTestDatabase();
    await db.siteContent.create({
      data: { mission: "Empower members.", joinSteps: ["Enroll in CCIS.", ""], socialLinks: [{ label: "Facebook", url: "https://facebook.com/umaksic" }, { label: "Bad", url: "http://x.test" }] },
    });

    // Prisma batches simultaneous findUnique calls into one query, which a
    // true/false unique column cannot take. Every public page does this.
    const [fromLayout, fromPage] = await Promise.all([getSiteContent(), getSiteContent()]);

    expect(fromLayout).toEqual(fromPage);
    expect(fromPage).toMatchObject({
      mission: "Empower members.",
      joinSteps: ["Enroll in CCIS."],
      socialLinks: [{ label: "Facebook", url: "https://facebook.com/umaksic" }],
    });
  });
});

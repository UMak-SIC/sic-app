import { afterEach, expect, test, vi } from "vitest";

const { assetFindFirst, eventCreate, eventFindFirst, eventFindMany, eventFindUnique, eventUpdateMany } =
  vi.hoisted(() => ({
    assetFindFirst: vi.fn(),
    eventCreate: vi.fn(),
    eventFindFirst: vi.fn(),
    eventFindMany: vi.fn(),
    eventFindUnique: vi.fn(),
    eventUpdateMany: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    asset: { findFirst: assetFindFirst },
    event: {
      create: eventCreate,
      findFirst: eventFindFirst,
      findMany: eventFindMany,
      findUnique: eventFindUnique,
      updateMany: eventUpdateMany,
    },
  }),
}));

import {
  createEvent,
  EventLifecycleError,
  getEvent,
  listEvents,
  publishEvent,
  updateDraft,
} from "@/lib/services/event-service";

const eventInput = {
  name: "  Welcome Night  ",
  details: "  Meet the team.  ",
  venue: "  Audio   Visual Room  ",
  startsAt: new Date("2026-10-01T09:00:00.000Z"),
  endsAt: new Date("2026-10-01T10:00:00.000Z"),
};

afterEach(() => {
  vi.resetAllMocks();
});

test("creates a trimmed draft event for the boundary-supplied administrator", async () => {
  eventCreate.mockResolvedValue({ id: "event-id", status: "DRAFT" });

  await expect(createEvent(eventInput, "admin-id")).resolves.toEqual({
    id: "event-id",
    status: "DRAFT",
  });

  expect(eventCreate).toHaveBeenCalledWith({
    data: {
      ...eventInput,
      name: "Welcome Night",
      details: "Meet the team.",
      // Trimmed and whitespace-collapsed, so a venue reads cleanly in an email.
      venue: "Audio Visual Room",
      createdById: "admin-id",
    },
  });
});

test("stores a blank venue as null rather than an empty string", async () => {
  eventCreate.mockResolvedValue({ id: "event-id" });

  await createEvent({ ...eventInput, venue: "   " }, "admin-id");

  // An empty string would render as a blank spot in a campaign email, which is
  // indistinguishable from a venue nobody typed.
  expect(eventCreate).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ venue: null }) })
  );
});

test("leaves the venue null when the caller omits it", async () => {
  eventCreate.mockResolvedValue({ id: "event-id" });
  const withoutVenue: Record<string, unknown> = { ...eventInput };
  delete withoutVenue.venue;

  await createEvent(withoutVenue as typeof eventInput, "admin-id");

  expect(eventCreate).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ venue: null }) })
  );
});

test("rejects a venue that is too long", async () => {
  await expect(
    createEvent({ ...eventInput, venue: "V".repeat(121) }, "admin-id"),
  ).rejects.toThrow("Venue must be at most 120 characters.");

  expect(eventCreate).not.toHaveBeenCalled();
});

test("rejects incomplete and invalid event timings before persistence", async () => {
  await expect(createEvent({ ...eventInput, name: " " }, "admin-id")).rejects.toBeInstanceOf(
    EventLifecycleError,
  );
  await expect(
    createEvent({ ...eventInput, endsAt: eventInput.startsAt }, "admin-id"),
  ).rejects.toThrow("must end after it starts");

  expect(eventCreate).not.toHaveBeenCalled();
});

test("requires a public asset when binding a banner", async () => {
  assetFindFirst.mockResolvedValue(null);

  await expect(
    createEvent({ ...eventInput, imageAssetId: "private-asset" }, "admin-id"),
  ).rejects.toThrow("public uploaded asset");
  expect(eventCreate).not.toHaveBeenCalled();
});

test("updates only drafts", async () => {
  eventUpdateMany.mockResolvedValue({ count: 0 });

  await expect(updateDraft("event-id", eventInput)).rejects.toThrow("Only draft events");
  expect(eventUpdateMany).toHaveBeenCalledWith({
    where: { id: "event-id", status: "DRAFT" },
    data: {
      ...eventInput,
      name: "Welcome Night",
      details: "Meet the team.",
      venue: "Audio Visual Room",
    },
  });
});

test("publishes a complete draft using a conditional transition", async () => {
  eventFindFirst.mockResolvedValue({
    ...eventInput,
    name: "Welcome Night",
    details: "Meet the team.",
    imageAssetId: null,
  });
  eventUpdateMany.mockResolvedValue({ count: 1 });

  await expect(publishEvent("event-id")).resolves.toBeUndefined();
  expect(eventUpdateMany).toHaveBeenCalledWith({
    where: { id: "event-id", status: "DRAFT" },
    data: { status: "PUBLISHED" },
  });
});

test("selects only the banner filename and the roster count for event lists", async () => {
  await listEvents();
  await getEvent("event-id");

  const imageAsset = { select: { originalFilename: true, objectKey: true, storageBucket: true } };
  expect(eventFindMany).toHaveBeenCalledWith({
    include: { imageAsset, _count: { select: { rosterEntries: true } } },
    orderBy: { startsAt: "desc" },
  });
  expect(eventFindUnique).toHaveBeenCalledWith({
    where: { id: "event-id" },
    include: { imageAsset, _count: { select: { rosterEntries: true } } },
  });
});

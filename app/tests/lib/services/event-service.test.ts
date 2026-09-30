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
  publishEvent,
  updateDraft,
} from "@/lib/services/event-service";

const eventInput = {
  name: "  Welcome Night  ",
  details: "  Meet the team.  ",
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
      createdById: "admin-id",
    },
  });
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
    data: { ...eventInput, name: "Welcome Night", details: "Meet the team." },
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

import { beforeEach, expect, test, vi } from "vitest";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const { asset, assetDeletionFailure, attendee, campaignAsset, emailDelivery, event, eventRosterEntry, transaction } = vi.hoisted(() => ({
  asset: { findMany: vi.fn(), deleteMany: vi.fn() },
  assetDeletionFailure: { deleteMany: vi.fn(), upsert: vi.fn() },
  attendee: { deleteMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  campaignAsset: { deleteMany: vi.fn() },
  emailDelivery: { deleteMany: vi.fn() },
  event: { updateMany: vi.fn() },
  eventRosterEntry: { deleteMany: vi.fn() },
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ assetDeletionFailure, $transaction: transaction }),
}));

import { runRetention } from "@/lib/services/retention-service";

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation((operation) => operation({ asset, assetDeletionFailure, attendee, campaignAsset, emailDelivery, event, eventRosterEntry }));
  emailDelivery.deleteMany.mockResolvedValue({ count: 2 });
  eventRosterEntry.deleteMany.mockResolvedValue({ count: 3 });
  attendee.deleteMany.mockResolvedValue({ count: 4 });
  attendee.findMany.mockResolvedValue([{ id: "attendee-id" }]);
  attendee.update.mockResolvedValue({});
  asset.findMany.mockResolvedValue([]);
  campaignAsset.deleteMany.mockResolvedValue({ count: 0 });
  event.updateMany.mockResolvedValue({ count: 0 });
});

test("removes expired delivery and roster data, then deletes or anonymizes attendees", async () => {
  const now = new Date("2030-03-01T12:30:45.678Z");

  await expect(runRetention(now)).resolves.toEqual({
    anonymizedAttendees: 1,
    assetDeletionFailures: 0,
    cutoff: new Date("2025-03-01T12:30:45.678Z"),
    deletedAttendees: 4,
    deletedAssets: 0,
    deletedDeliveries: 2,
    deletedRosterEntries: 3,
  });

  const cutoff = new Date("2025-03-01T12:30:45.678Z");
  expect(emailDelivery.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  expect(eventRosterEntry.deleteMany).toHaveBeenCalledWith({
    where: { event: { endsAt: { lt: cutoff } } },
  });
  expect(campaignAsset.deleteMany).toHaveBeenCalledWith({
    where: { campaign: { event: { endsAt: { lt: cutoff } } } },
  });
  expect(event.updateMany).toHaveBeenCalledWith({
    where: { endsAt: { lt: cutoff }, imageAssetId: { not: null } },
    data: { imageAssetId: null },
  });
  expect(attendee.deleteMany).toHaveBeenCalledWith({
    where: { createdAt: { lt: cutoff }, rosterEntries: { none: {} } },
  });
  expect(attendee.update).toHaveBeenCalledWith({
    where: { id: "attendee-id" },
    data: {
      displayEmail: "deleted-attendee-id@invalid.local",
      name: "Deleted attendee",
      normalizedEmail: "deleted-attendee-id@invalid.local",
      studentId: "deleted-attendee-id",
    },
  });
});

test("records an asset deletion failure for a later retention retry", async () => {
  asset.findMany.mockResolvedValue([{ id: "asset-id", objectKey: "assets/file.pdf", storageBucket: "PRIVATE_IMAGES" }]);
  const storageError = new Error("Storage unavailable");

  await expect(runRetention(new Date("2030-01-01T00:00:00.000Z"), {
    getNeonStorageClient: () => ({ send: vi.fn().mockRejectedValue(storageError) }),
  })).resolves.toMatchObject({ assetDeletionFailures: 1, deletedAssets: 0 });

  expect(assetDeletionFailure.upsert).toHaveBeenCalledWith({
    where: { assetId: "asset-id" },
    create: { assetId: "asset-id", errorMessage: "Storage unavailable" },
    update: { errorMessage: "Storage unavailable", lastFailedAt: new Date("2030-01-01T00:00:00.000Z") },
  });
});

test("deletes an unreferenced expired file from storage before removing its metadata", async () => {
  asset.findMany.mockResolvedValue([{ id: "asset-id", objectKey: "assets/file.pdf", storageBucket: "PRIVATE_IMAGES" }]);
  asset.deleteMany.mockResolvedValue({ count: 1 });
  assetDeletionFailure.deleteMany.mockResolvedValue({ count: 0 });
  const send = vi.fn().mockResolvedValue({});

  await expect(runRetention(new Date("2030-01-01T00:00:00.000Z"), {
    getNeonStorageClient: () => ({ send }),
  })).resolves.toMatchObject({ assetDeletionFailures: 0, deletedAssets: 1 });

  expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);
  expect(asset.deleteMany).toHaveBeenCalledWith({
    where: { id: "asset-id", eventImages: { none: {} }, campaignAssets: { none: {} } },
  });
});

test("uses the last day of February for leap-day retention cutoffs", async () => {
  attendee.findMany.mockResolvedValue([]);

  await expect(runRetention(new Date("2028-02-29T00:00:00.000Z"))).resolves.toMatchObject({
    cutoff: new Date("2023-02-28T00:00:00.000Z"),
  });
});

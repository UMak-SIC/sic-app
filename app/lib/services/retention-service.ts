import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { getNeonStorageClient, type StorageClient } from "@/lib/storage/neon-storage-client";

export type RetentionResult = {
  anonymizedAttendees: number;
  assetDeletionFailures: number;
  cutoff: Date;
  deletedAssets: number;
  deletedAttendees: number;
  deletedDeliveries: number;
  deletedRosterEntries: number;
};

type RetentionDependencies = {
  getNeonStorageClient: () => StorageClient;
  prisma?: PrismaClient;
};

const defaultDependencies: RetentionDependencies = { getNeonStorageClient };

function fiveYearsBefore(now: Date): Date {
  const year = now.getUTCFullYear() - 5;
  const month = now.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(now.getUTCDate(), lastDayOfMonth),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
}

export async function runRetention(
  now = new Date(),
  dependencies: RetentionDependencies = defaultDependencies,
): Promise<RetentionResult> {
  const cutoff = fiveYearsBefore(now);
  const prisma = dependencies.prisma ?? getPrismaClient();

  const retained = await prisma.$transaction(async (tx) => {
    const deletedDeliveries = await tx.emailDelivery.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    const deletedRosterEntries = await tx.eventRosterEntry.deleteMany({
      where: { event: { endsAt: { lt: cutoff } } },
    });
    // Expired event artwork and campaign files lose their references first. An
    // asset remains available until it is itself five years old.
    await tx.campaignAsset.deleteMany({
      where: { campaign: { event: { endsAt: { lt: cutoff } } } },
    });
    await tx.event.updateMany({
      where: { endsAt: { lt: cutoff }, imageAssetId: { not: null } },
      data: { imageAssetId: null },
    });
    const deletedAttendees = await tx.attendee.deleteMany({
      where: { createdAt: { lt: cutoff }, rosterEntries: { none: {} } },
    });
    const retainedAttendees = await tx.attendee.findMany({
      where: { createdAt: { lt: cutoff }, rosterEntries: { some: {} } },
      select: { id: true },
    });

    await Promise.all(
      retainedAttendees.map(({ id }) =>
        tx.attendee.update({
          where: { id },
          data: {
            displayEmail: `deleted-${id}@invalid.local`,
            name: "Deleted attendee",
            normalizedEmail: `deleted-${id}@invalid.local`,
            studentId: `deleted-${id}`,
          },
        }),
      ),
    );

    const assets = await tx.asset.findMany({
      where: {
        eventImages: { none: {} },
        campaignAssets: { none: {} },
        OR: [
          { uploadedAt: { lt: cutoff } },
          { deletionFailure: { isNot: null } },
        ],
      },
      select: { id: true, objectKey: true, storageBucket: true },
    });

    return {
      anonymizedAttendees: retainedAttendees.length,
      deletedAttendees: deletedAttendees.count,
      deletedDeliveries: deletedDeliveries.count,
      deletedRosterEntries: deletedRosterEntries.count,
      assets,
    };
  });

  let deletedAssets = 0;
  let assetDeletionFailures = 0;
  let storage: StorageClient | undefined;

  for (const asset of retained.assets) {
    try {
      if (!asset.storageBucket) throw new Error("This uploaded file has no storage location.");
      storage ??= dependencies.getNeonStorageClient();
      await storage.send(new DeleteObjectCommand({
        Bucket: asset.storageBucket === "PRIVATE_IMAGES" ? "private-images" : "public-images",
        Key: asset.objectKey,
      }));
      const deletion = await prisma.$transaction(async (tx) => {
        const deleted = await tx.asset.deleteMany({
          where: {
            id: asset.id,
            eventImages: { none: {} },
            campaignAssets: { none: {} },
          },
        });
        if (deleted.count > 0) await tx.assetDeletionFailure.deleteMany({ where: { assetId: asset.id } });
        return deleted.count;
      });
      deletedAssets += deletion;
    } catch (error) {
      assetDeletionFailures += 1;
      await prisma.assetDeletionFailure.upsert({
        where: { assetId: asset.id },
        create: { assetId: asset.id, errorMessage: error instanceof Error ? error.message : "File deletion failed." },
        update: { errorMessage: error instanceof Error ? error.message : "File deletion failed.", lastFailedAt: now },
      });
    }
  }

  return {
    anonymizedAttendees: retained.anonymizedAttendees,
    assetDeletionFailures,
    cutoff,
    deletedAssets,
    deletedAttendees: retained.deletedAttendees,
    deletedDeliveries: retained.deletedDeliveries,
    deletedRosterEntries: retained.deletedRosterEntries,
  };
}

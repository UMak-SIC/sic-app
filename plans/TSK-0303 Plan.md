## Goal

Persist the validated metadata for each successfully uploaded Neon Object Storage asset and return its database UUID, allowing later event and campaign workflows to reference a durable asset record.

## Source Of Truth

- GitHub issue [#21: TSK-0303](https://github.com/UMak-SIC/sic-app/issues/21)
- `docs/traceability-matrix.md` (TSK-0303 and DMA-11)
- `app/prisma/schema.prisma` (`Asset` model)

## Non-Goals

- Asset retrieval, deletion, presigned URLs, or access-control changes.
- New database schema or migration work; the existing `assets` table already has every required column.
- Associating an asset with an event or campaign.

## Execution Order

## PR Stacking Strategy

```
dev <- feat/tsk-0301-neon-storage-client <- feat/tsk-0302-asset-upload <- feat/tsk-0303-asset-metadata
```

Create `feat/tsk-0303-asset-metadata` from the current `feat/tsk-0302-asset-upload` branch and target its pull request at `dev` after its dependency is merged, or at `feat/tsk-0302-asset-upload` while the stack remains open.

## Linear Sub-Issue Tracking

No Linear project is configured for this GitHub issue; the work is a single vertical slice and needs no sub-issues.

### 1. Create a focused asset persistence service

- Add `app/lib/services/asset-service.ts` with a create operation that writes the object key, original filename, validated media type, byte size, and authenticated admin ID through Prisma.
- Return only the generated asset ID so the upload HTTP response stays JSON-serializable and exposes a stable reference without leaking irrelevant persistence fields.

### 2. Persist metadata from the upload workflow

- Update `app/lib/storage/asset-upload.ts` to invoke the service after a successful `PutObjectCommand` using the converted or validated bytes that were actually stored.
- Include `assetId` in the existing 201 response; validation and authorization failures must remain pre-write and preserve their current responses.

### 3. Cover the service boundary and route contract

- Add `app/tests/lib/services/asset-service.test.ts` to assert the Prisma create payload maps every DMA-11 field and returns the UUID.
- Update `app/tests/app/api/assets/upload/route.test.ts` to mock the service and verify both public and private uploads receive the persisted ID while invalid or unauthorized uploads never call it.

## Acceptance Criteria

- A successful upload creates one `assets` record with the object key, original filename, media type, byte size, and uploader ID matching the stored object.
- The upload response returns the persisted asset UUID as `assetId` with status 201.
- Validation and authorization failures do not write an object or an asset record.
- Targeted Vitest tests and Prisma schema validation pass.

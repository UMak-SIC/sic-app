## Goal

Allow authenticated administrators to upload validated assets through a server-only route. The route converts supported images to WebP, preserves PDFs up to 20 MiB, and stores bytes in the private Neon Object Storage `uploads` bucket without creating database metadata, which belongs to TSK-0303.

## Source Of Truth

- GitHub issue #20: TSK-0302
- `docs/traceability-matrix.md` (US-14, DMA-11, NFR-03)
- `app/lib/storage/neon-storage-client.ts`

## Non-Goals

- Persisting an `assets` record or returning an asset UUID.
- Browser-direct storage uploads or exposing storage credentials.
- Authentication and authorization, owned by EPIC-02.

## Execution Order

## PR Stacking Strategy

`dev -> feat/tsk-0302-asset-upload`

Create the feature branch from current `dev`; target `dev` when opening the pull request. This implementation is a single, reviewable vertical slice and does not require a stack.

## Linear Sub-Issue Tracking

Create sub-issues from this plan when ready. The source task is GitHub issue #20.

### 1. Validate uploaded content

- Add `app/lib/storage/upload-validation.ts` with an allowlist for PNG, JPEG, WebP, and PDF; images cap at 10 MiB and PDFs at 20 MiB.
- Decode images against their declared MIME type before recompressing them as WebP; reject malformed or spoofed media before storage.

### 2. Upload through the server route

- Add `app/app/api/assets/upload/route.ts` to require an allowlisted Neon Auth administrator, parse one bounded `file` form field, reject invalid uploads with 400, and send valid bytes through the Neon storage client using an opaque UUID key under `uploads/`.
- Keep the bucket private and omit database access because metadata persistence is the TSK-0303 seam.

### 3. Verify request behavior

- Add unit tests for the validator and route at `app/tests/lib/storage/upload-validation.test.ts` and `app/tests/app/api/assets/upload/route.test.ts`.
- Mock the storage client to prove invalid data never calls S3 and valid data writes the expected bucket, key, MIME type, and byte count.

## Acceptance Criteria

- Authenticated allowlisted administrators can upload valid files; unauthenticated requests return 401 and authenticated non-admins return 403 before storage access.
- PNG, JPEG, and WebP files that decode as their declared MIME type upload as WebP; valid PDFs upload unchanged to the `uploads` bucket.
- Unsupported, spoofed, empty, oversized, or malformed files return 400 and never reach storage.
- Object keys do not contain user-controlled filenames.
- Tests, linting, and production build pass.

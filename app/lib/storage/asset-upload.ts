import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAsset } from "@/lib/services/asset-service";

import { getNeonStorageClient, type StorageClient } from "./neon-storage-client";
import {
  MAX_MULTIPART_BODY_SIZE_BYTES,
  validateUpload,
} from "./upload-validation";

type AssetBucket = "private-images" | "public-images";

export type UploadDependencies = {
  createAsset: typeof createAsset;
  getNeonStorageClient: () => StorageClient;
  requireAdmin: typeof requireAdmin;
  validateUpload: typeof validateUpload;
};

const defaultDependencies: UploadDependencies = {
  createAsset,
  getNeonStorageClient,
  requireAdmin,
  validateUpload,
};

const assetBucketValues = {
  "private-images": "PRIVATE_IMAGES",
  "public-images": "PUBLIC_IMAGES",
} as const;

async function parseUploadFormData(request: Request): Promise<FormData | Response> {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BODY_SIZE_BYTES) {
    return Response.json({ error: "Upload request is too large." }, { status: 400 });
  }

  if (!request.body) {
    return Response.json({ error: "Request must contain multipart form data." }, { status: 400 });
  }

  const reader = request.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let bodySize = 0;

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const value = chunk.value;

    bodySize += value.byteLength;

    if (bodySize > MAX_MULTIPART_BODY_SIZE_BYTES) {
      await reader.cancel();
      return Response.json({ error: "Upload request is too large." }, { status: 400 });
    }

    chunks.push(Uint8Array.from(value).buffer);
  }

  try {
    return await new Request(request.url, {
      method: request.method,
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: new Blob(chunks),
    }).formData();
  } catch {
    return Response.json({ error: "Request must contain multipart form data." }, { status: 400 });
  }
}

export async function uploadAsset(
  request: Request,
  bucket: AssetBucket,
  dependencies: UploadDependencies = defaultDependencies,
): Promise<Response> {
  const authorization = await dependencies.requireAdmin();

  if (authorization instanceof Response) {
    return authorization;
  }

  const formData = await parseUploadFormData(request);

  if (formData instanceof Response) {
    return formData;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "A file upload is required." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = await dependencies.validateUpload(file, bytes);

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const objectKey = `assets/${randomUUID()}.${validation.extension}`;

  const storage = dependencies.getNeonStorageClient();

  await storage.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: validation.bytes,
      ContentLength: validation.bytes.byteLength,
      ContentType: validation.mediaType,
    }),
  );
  try {
    const asset = await dependencies.createAsset({
      objectKey,
      storageBucket: assetBucketValues[bucket],
      originalFilename: file.name,
      mediaType: validation.mediaType,
      byteSize: validation.bytes.byteLength,
      uploadedById: authorization.adminId,
    });

    return Response.json(
      {
        assetId: asset.id,
        objectKey,
        originalFilename: file.name,
        mediaType: validation.mediaType,
        byteSize: validation.bytes.byteLength,
      },
      { status: 201 },
    );
  } catch (error) {
    try {
      await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch {
      // Preserve the metadata persistence error when rollback also fails.
    }

    throw error;
  }
}

import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getNeonStorageClient } from "@/lib/storage/neon-storage-client";
import {
  MAX_MULTIPART_BODY_SIZE_BYTES,
  validateUpload,
} from "@/lib/storage/upload-validation";

const uploadsBucket = "uploads";

export const runtime = "nodejs";

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

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

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

export async function POST(request: Request): Promise<Response> {
  const authorization = await requireAdmin();

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
  const validation = await validateUpload(file, bytes);

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const objectKey = `uploads/${randomUUID()}.${validation.extension}`;

  await getNeonStorageClient().send(
    new PutObjectCommand({
      Bucket: uploadsBucket,
      Key: objectKey,
      Body: validation.bytes,
      ContentLength: validation.bytes.byteLength,
      ContentType: validation.mediaType,
    }),
  );

  return Response.json(
    {
      objectKey,
      originalFilename: file.name,
      mediaType: validation.mediaType,
      byteSize: validation.bytes.byteLength,
    },
    { status: 201 },
  );
}

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, expect, test, vi } from "vitest";

const { requireAdmin, send, validateUpload } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  send: vi.fn(),
  validateUpload: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));

vi.mock("@/lib/storage/neon-storage-client", () => ({
  getNeonStorageClient: () => ({ send }),
}));

vi.mock("@/lib/storage/upload-validation", () => ({
  MAX_MULTIPART_BODY_SIZE_BYTES: 10 * 1024 * 1024 + 64 * 1024,
  validateUpload,
}));

import { POST } from "@/app/api/assets/upload/route";
import { POST as publicUpload } from "@/app/api/assets/public/upload/route";

afterEach(() => {
  vi.resetAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  validateUpload.mockResolvedValue({
    valid: true,
    bytes: new Uint8Array([1, 2, 3]),
    extension: "webp",
    mediaType: "image/webp",
  });
});

function uploadRequest(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  return new Request("http://localhost/api/assets/upload", {
    method: "POST",
    body: formData,
  });
}

test("uploads validated private assets under an opaque key", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  validateUpload.mockResolvedValue({
    valid: true,
    bytes: new Uint8Array([1, 2, 3]),
    extension: "webp",
    mediaType: "image/webp",
  });
  send.mockResolvedValueOnce({});
  const file = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    "banner.png",
    { type: "image/png" },
  );

  const response = await POST(uploadRequest(file));

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    originalFilename: "banner.png",
    objectKey: expect.stringMatching(/^assets\/[0-9a-f-]+\.webp$/),
    mediaType: "image/webp",
    byteSize: 3,
  });
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
  expect(send.mock.calls[0][0].input).toMatchObject({
    Bucket: "private-images",
    ContentLength: 3,
    ContentType: "image/webp",
    Key: expect.stringMatching(/^assets\/[0-9a-f-]+\.webp$/),
  });
});

test("requires an administrator to write public assets", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  validateUpload.mockResolvedValue({
    valid: true,
    bytes: new Uint8Array([1, 2, 3]),
    extension: "webp",
    mediaType: "image/webp",
  });
  send.mockResolvedValueOnce({});
  const file = new File([new Uint8Array([1, 2, 3])], "banner.png", {
    type: "image/png",
  });

  const response = await publicUpload(uploadRequest(file));

  expect(response.status).toBe(201);
  expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "public-images" });
});

test("rejects a spoofed MIME type without writing to storage", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  validateUpload.mockResolvedValue({
    valid: false,
    error: "File contents are not valid for its declared media type.",
  });
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "banner.png", {
    type: "image/png",
  });

  const response = await POST(uploadRequest(file));

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "File contents are not valid for its declared media type.",
  });
  expect(send).not.toHaveBeenCalled();
});

test("rejects a non-multipart request without writing to storage", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  const response = await POST(
    new Request("http://localhost/api/assets/upload", {
      method: "POST",
      body: "not an upload",
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Request must contain multipart form data.",
  });
  expect(send).not.toHaveBeenCalled();
});

test("denies unauthenticated requests before parsing or writing uploads", async () => {
  requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

  const response = await POST(
    new Request("http://localhost/api/assets/upload", {
      method: "POST",
      body: "not an upload",
    }),
  );

  expect(response.status).toBe(401);
  expect(validateUpload).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

test("rejects requests whose declared multipart body is too large", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const response = await POST(
    new Request("http://localhost/api/assets/upload", {
      method: "POST",
      headers: { "content-length": String(10 * 1024 * 1024 + 64 * 1024 + 1) },
      body: "not an upload",
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "Upload request is too large." });
  expect(validateUpload).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

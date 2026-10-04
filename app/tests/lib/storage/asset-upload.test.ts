import { expect, test, vi } from "vitest";

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }));

import { uploadAsset, type UploadDependencies } from "@/lib/storage/asset-upload";
import { RecordingObjectStorageFake } from "@/tests/fakes";

function uploadRequest(file: File): Request {
  const formData = new FormData();
  formData.set("file", file);

  return new Request("http://localhost/api/assets/upload", {
    method: "POST",
    body: formData,
  });
}

test("accepts the recording object storage fake through the upload dependency seam", async () => {
  const storage = new RecordingObjectStorageFake();
  const createAsset = vi.fn().mockResolvedValue({ id: "asset-id" });
  const dependencies: UploadDependencies = {
    createAsset,
    getNeonStorageClient: () => storage,
    requireAdmin: async () => ({ adminId: "admin-id" }),
    validateUpload: async () => ({
      bytes: new Uint8Array([1, 2, 3]),
      extension: "webp",
      mediaType: "image/webp",
      valid: true,
    }),
  };

  const response = await uploadAsset(
    uploadRequest(new File([new Uint8Array([1, 2, 3])], "banner.png", { type: "image/png" })),
    "private-images",
    dependencies,
  );

  expect(response.status).toBe(201);
  expect(storage.commands).toHaveLength(1);
  expect(createAsset).toHaveBeenCalledWith({
    byteSize: 3,
    mediaType: "image/webp",
    objectKey: expect.stringMatching(/^assets\/[0-9a-f-]+\.webp$/),
    originalFilename: "banner.png",
    storageBucket: "PRIVATE_IMAGES",
    uploadedById: "admin-id",
  });
});

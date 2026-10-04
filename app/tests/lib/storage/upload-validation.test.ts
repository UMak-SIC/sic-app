import sharp from "sharp";
import { expect, test } from "vitest";

import {
  MAX_IMAGE_UPLOAD_SIZE_BYTES,
  MAX_PDF_UPLOAD_SIZE_BYTES,
  validateUpload,
} from "@/lib/storage/upload-validation";

function file(size: number, type: string) {
  return { size, type };
}

async function image(format: "jpeg" | "png" | "webp") {
  return new Uint8Array(
    await sharp({ create: { width: 1, height: 1, channels: 3, background: "#000" } })
      .toFormat(format)
      .toBuffer(),
  );
}

test("converts each supported image format to WebP", async () => {
  for (const [type, format] of Object.entries({
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  }) as ["image/jpeg" | "image/png" | "image/webp", "jpeg" | "png" | "webp"][]) {
    const bytes = await image(format);
    const result = await validateUpload(file(bytes.length, type), bytes);

    expect(result).toMatchObject({
      valid: true,
      extension: "webp",
      mediaType: "image/webp",
    });

    if (result.valid) {
      await expect(sharp(result.bytes).metadata()).resolves.toMatchObject({ format: "webp" });
    }
  }
});

test("preserves valid PDFs and gives them a 20 MiB limit", async () => {
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\nstartxref\n0\n%%EOF\n");

  await expect(validateUpload(file(pdf.length, "application/pdf"), pdf)).resolves.toMatchObject({
    valid: true,
    extension: "pdf",
    mediaType: "application/pdf",
    bytes: pdf,
  });
  await expect(validateUpload(file(MAX_PDF_UPLOAD_SIZE_BYTES + 1, "application/pdf"), new Uint8Array([0]))).resolves.toMatchObject({ valid: false });
});

test("rejects empty, oversized, unsupported, corrupt, and mismatched files", async () => {
  await expect(validateUpload(file(0, "image/png"), new Uint8Array())).resolves.toMatchObject({ valid: false });
  await expect(validateUpload(file(MAX_IMAGE_UPLOAD_SIZE_BYTES + 1, "image/png"), new Uint8Array([0x89]))).resolves.toMatchObject({ valid: false });
  await expect(validateUpload(file(3, "text/plain"), new Uint8Array([1, 2, 3]))).resolves.toMatchObject({ valid: false });
  await expect(validateUpload(file(8, "image/png"), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).resolves.toMatchObject({ valid: false });
  await expect(validateUpload(file(5, "application/pdf"), new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).resolves.toMatchObject({ valid: false });
  const jpeg = await image("jpeg");
  await expect(validateUpload(file(jpeg.length, "image/png"), jpeg)).resolves.toMatchObject({ valid: false });
  await expect(validateUpload(file(1, "image/png"), new Uint8Array([0]))).resolves.toMatchObject({ valid: false });
});

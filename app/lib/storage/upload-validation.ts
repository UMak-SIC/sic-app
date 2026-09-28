import sharp from "sharp";

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_MULTIPART_BODY_SIZE_BYTES = MAX_PDF_UPLOAD_SIZE_BYTES + 64 * 1024;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageFormats = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type UploadValidationResult =
  | {
      valid: true;
      bytes: Uint8Array;
      extension: "pdf" | "webp";
      mediaType: "application/pdf" | "image/webp";
    }
  | { valid: false; error: string };

function isStructurallyValidPdf(bytes: Uint8Array): boolean {
  const document = new TextDecoder().decode(bytes);

  return (
    document.startsWith("%PDF-") &&
    /\n\d+\s+\d+\s+obj\b/.test(document) &&
    /\nstartxref\s+\d+\s+%%EOF\s*$/.test(document)
  );
}

async function normalizeImage(
  bytes: Uint8Array,
  type: keyof typeof imageFormats,
): Promise<Uint8Array | undefined> {
  try {
    const image = sharp(bytes, {
      failOn: "error",
      limitInputPixels: 50_000_000,
      pages: 1,
    });
    const metadata = await image.metadata();

    if (
      metadata.format !== imageFormats[type] ||
      !metadata.width ||
      !metadata.height
    ) {
      return undefined;
    }

    return new Uint8Array(
      await image.webp({ quality: 82, effort: 4 }).toBuffer(),
    );
  } catch {
    return undefined;
  }
}

export async function validateUpload(
  file: Pick<File, "size" | "type">,
  bytes: Uint8Array,
): Promise<UploadValidationResult> {
  if (file.size === 0) {
    return { valid: false, error: "File must not be empty." };
  }

  if (file.size !== bytes.byteLength) {
    return { valid: false, error: "File size does not match its contents." };
  }

  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_UPLOAD_SIZE_BYTES) {
      return { valid: false, error: "PDF files must not exceed 20 MiB." };
    }

    if (!isStructurallyValidPdf(bytes)) {
      return { valid: false, error: "File contents are not valid for its declared media type." };
    }

    return {
      valid: true,
      bytes,
      extension: "pdf",
      mediaType: "application/pdf",
    };
  }

  if (!imageTypes.has(file.type)) {
    return { valid: false, error: "Only PNG, JPEG, WebP, and PDF files are supported." };
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    return { valid: false, error: "Image files must not exceed 10 MiB." };
  }

  const normalizedImage = await normalizeImage(
    bytes,
    file.type as keyof typeof imageFormats,
  );

  if (!normalizedImage) {
    return { valid: false, error: "File contents are not valid for its declared media type." };
  }

  return {
    valid: true,
    bytes: normalizedImage,
    extension: "webp",
    mediaType: "image/webp",
  };
}

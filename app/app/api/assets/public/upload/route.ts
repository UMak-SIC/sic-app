import { uploadAsset } from "@/lib/storage/asset-upload";

export const runtime = "nodejs";

async function uploadPublicAsset(request: Request): Promise<Response> {
  return uploadAsset(request, "public-images");
}

export { uploadPublicAsset as POST };

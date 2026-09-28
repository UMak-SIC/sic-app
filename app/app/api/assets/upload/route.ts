import { uploadAsset } from "@/lib/storage/asset-upload";

export const runtime = "nodejs";

async function uploadPrivateAsset(request: Request): Promise<Response> {
  return uploadAsset(request, "private-images");
}

export { uploadPrivateAsset as POST };

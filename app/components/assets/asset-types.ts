export type AssetCategory = "image" | "document";
export type AssetFormat = "jpg" | "png" | "webp" | "pdf";

export interface AssetReference {
  id: string;
  entityId: string;
  entityType: "event" | "campaign";
  entityTitle: string;
  role: "banner" | "attachment" | "cover" | "general";
  isLocked: boolean;
}

export interface AssetItem {
  id: string;
  objectKey: string;
  originalFilename: string;
  mediaType: string;
  format: AssetFormat;
  category: AssetCategory;
  byteSize: number;
  fileSizeFormatted: string;
  uploadedBy: string;
  uploadedAt: string;
  dimensions?: string;
  pageCount?: number;
  sha256Hash: string;
  url: string;
  previewUrl?: string;
  references: AssetReference[];
  downloadCount: number;
}

export interface StorageKpis {
  totalBytesUsed: number;
  totalBytesFormatted: string;
  storageQuotaBytes: number;
  storageQuotaFormatted: string;
  totalFilesCount: number;
  imageCount: number;
  documentCount: number;
  referencedCount: number;
  unusedCount: number;
  storageHealthStatus: "healthy" | "warning" | "error";
}

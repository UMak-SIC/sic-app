"use client";

import * as React from "react";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { AssetKpiRow } from "@/components/assets/asset-kpi-row";
import { AssetLibraryView } from "@/components/assets/asset-library-view";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { AssetUploadDialog } from "@/components/assets/asset-upload-dialog";
import { AssetPolicyDialog } from "@/components/assets/asset-policy-dialog";
import { INITIAL_ASSETS, STORAGE_KPIS_DATA } from "@/components/assets/asset-data";
import { AssetItem, StorageKpis } from "@/components/assets/asset-types";

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetItem[]>(INITIAL_ASSETS);
  const [selectedAsset, setSelectedAsset] = React.useState<AssetItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = React.useState(false);

  // Compute dynamic KPIs
  const currentKpis: StorageKpis = React.useMemo(() => {
    const totalBytes = assets.reduce((acc, a) => acc + a.byteSize, 0);
    const sizeInMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const imageCount = assets.filter((a) => a.category === "image").length;
    const docCount = assets.filter((a) => a.category === "document").length;
    const refCount = assets.filter((a) => a.references.length > 0).length;

    return {
      totalBytesUsed: totalBytes,
      totalBytesFormatted: `${sizeInMb} MB`,
      storageQuotaBytes: STORAGE_KPIS_DATA.storageQuotaBytes,
      storageQuotaFormatted: STORAGE_KPIS_DATA.storageQuotaFormatted,
      totalFilesCount: assets.length,
      imageCount,
      documentCount: docCount,
      referencedCount: refCount,
      unusedCount: assets.length - refCount,
      storageHealthStatus: "healthy",
    };
  }, [assets]);

  const handleInspectAsset = (asset: AssetItem) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  };

  const handleAssetUploaded = (newAsset: AssetItem) => {
    setAssets((prev) => [newAsset, ...prev]);
  };

  const handleDirectUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const format = file.name.endsWith(".png")
      ? "png"
      : file.name.endsWith(".webp")
      ? "webp"
      : file.name.endsWith(".pdf")
      ? "pdf"
      : "jpg";

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${sizeInMb} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const newAsset: AssetItem = {
      id: "ast_" + Date.now(),
      objectKey: `assets/${isImage ? "banners" : "documents"}/${file.name}`,
      originalFilename: file.name,
      mediaType: file.type || (isImage ? "image/jpeg" : "application/pdf"),
      format,
      category: isImage ? "image" : "document",
      byteSize: file.size,
      fileSizeFormatted: sizeFormatted,
      uploadedBy: "Charles Reyes",
      uploadedAt: "Just now",
      dimensions: isImage ? "1200 × 500 px" : undefined,
      pageCount: isImage ? undefined : 1,
      sha256Hash: "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
      url: isImage ? URL.createObjectURL(file) : "#",
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      references: [],
      downloadCount: 0,
    };

    setAssets((prev) => [newAsset, ...prev]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-14 font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title={<span className="font-display font-bold text-ink">Asset Library & Storage</span>}
        description="Manage event hero banners, program documents, and delete-protected university media."
        action={
          <PageHeaderButton
            icon={<Plus size={16} weight="bold" className="text-white" />}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Asset
          </PageHeaderButton>
        }
      />

      {/* 2. Storage Metric KPI Row */}
      <AssetKpiRow kpis={currentKpis} />

      {/* 3. Main Asset Library View */}
      <AssetLibraryView
        assets={assets}
        onSelectAsset={handleInspectAsset}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenPolicy={() => setIsPolicyOpen(true)}
        onDirectUpload={handleDirectUpload}
        onDeleteAsset={handleDeleteAsset}
      />

      {/* 4. Detail Sheet Drawer */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onDeleteAsset={handleDeleteAsset}
      />

      {/* 5. Upload Modal Dialog */}
      <AssetUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onAssetUploaded={handleAssetUploaded}
      />

      {/* 6. Asset Policy Modal Dialog */}
      <AssetPolicyDialog
        open={isPolicyOpen}
        onOpenChange={setIsPolicyOpen}
        lockedCount={currentKpis.referencedCount}
      />
    </div>
  );
}

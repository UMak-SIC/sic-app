"use client";

import * as React from "react";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { AssetKpiRow } from "@/components/assets/asset-kpi-row";
import { AssetLibraryView } from "@/components/assets/asset-library-view";
import { AssetDetailSheet } from "@/components/assets/asset-detail-sheet";
import { AssetUploadDialog } from "@/components/assets/asset-upload-dialog";
import { AssetPolicyDialog } from "@/components/assets/asset-policy-dialog";
import { AssetItem, StorageKpis } from "@/components/assets/asset-types";

type AssetResponse = {
  id: string;
  objectKey: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  uploadedAt: string;
  url: string | null;
  references: AssetItem["references"];
};

function formatAsset(asset: AssetResponse): AssetItem {
  const isDocument = asset.mediaType === "application/pdf" || asset.originalFilename.toLowerCase().endsWith(".pdf");
  const format = isDocument
    ? "pdf"
    : asset.originalFilename.toLowerCase().endsWith(".png")
    ? "png"
    : asset.originalFilename.toLowerCase().endsWith(".webp")
    ? "webp"
    : "jpg";

  return {
    ...asset,
    format,
    category: isDocument ? "document" : "image",
    fileSizeFormatted: asset.byteSize >= 1024 * 1024
      ? `${(asset.byteSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(asset.byteSize / 1024))} KB`,
    uploadedBy: "Administrator",
    uploadedAt: new Date(asset.uploadedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    previewUrl: isDocument ? undefined : asset.url ?? undefined,
    downloadCount: 0,
  };
}

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = React.useState<AssetItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = React.useState(false);

  const loadAssets = React.useEffectEvent(async () => {
    try {
      const response = await fetch("/api/assets");
      if (!response.ok) throw new Error("Unable to load files.");

      const payload = await response.json() as { assets: AssetResponse[] };
      setAssets(payload.assets.map(formatAsset));
      setLoadError(null);
    } catch {
      setLoadError("We could not load your files. Please refresh the page and try again.");
    }
  });

  React.useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/assets", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load files.");
        return response.json() as Promise<{ assets: AssetResponse[] }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setAssets(payload.assets.map(formatAsset));
        setLoadError(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("We could not load your files. Please refresh the page and try again.");
        }
      });

    return () => controller.abort();
  }, []);

  const currentKpis: StorageKpis = React.useMemo(() => {
    const totalBytes = assets.reduce((acc, a) => acc + a.byteSize, 0);
    const sizeInMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const imageCount = assets.filter((a) => a.category === "image").length;
    const docCount = assets.filter((a) => a.category === "document").length;
    const refCount = assets.filter((a) => a.references.length > 0).length;

    return {
      totalBytesUsed: totalBytes,
      totalBytesFormatted: `${sizeInMb} MB`,
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

  const handleAssetUploaded = () => {
    void loadAssets();
  };

  const handleDirectUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/assets/public/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Unable to upload file.");
      await loadAssets();
    } catch {
      setLoadError("We could not upload that file. Please try again.");
    }
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

      {loadError && (
        <p className="rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-red">
          {loadError}
        </p>
      )}

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

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, Image as ImageIcon, FilePdf, Check } from "@phosphor-icons/react";
import { AssetItem, AssetCategory } from "./asset-types";
import { cn } from "@/lib/utils";

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryFilter?: AssetCategory;
  onSelectAsset: (asset: AssetItem) => void;
  title?: string;
  description?: string;
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  categoryFilter,
  onSelectAsset,
  title = "Select from Library",
  description = "Choose an uploaded file from your asset library.",
}: AssetPickerDialogProps) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    fetch("/api/assets/public")
      .then((res) => (res.ok ? res.json() : { assets: [] }))
      .then((data) => {
        if (!mounted) return;
        const mapped: AssetItem[] = (data.assets || []).map((a: {
          id: string;
          originalFilename: string;
          mediaType: string;
          byteSize: number;
          uploadedAt: string;
          url: string | null;
        }) => {
          const isDoc = a.mediaType === "application/pdf" || a.originalFilename.endsWith(".pdf");
          const format = a.originalFilename.endsWith(".png")
            ? "png"
            : a.originalFilename.endsWith(".webp")
            ? "webp"
            : isDoc
            ? "pdf"
            : "jpg";
          const size = a.byteSize || 0;
          const sizeFormatted =
            size > 1024 * 1024
              ? `${(size / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(size / 1024)} KB`;

          return {
            id: a.id,
            objectKey: "",
            originalFilename: a.originalFilename,
            mediaType: a.mediaType,
            format,
            category: isDoc ? "document" : "image",
            byteSize: size,
            fileSizeFormatted: sizeFormatted,
            uploadedBy: "Administrator",
            uploadedAt: a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Uploaded",
            sha256Hash: "",
            url: a.url || "#",
            previewUrl: a.url || undefined,
            references: [],
            downloadCount: 0,
          };
        });
        setAssets(mapped);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const filtered = assets.filter((a) => {
    const matchesCat = !categoryFilter || a.category === categoryFilter;
    const matchesSearch =
      search === "" ||
      a.originalFilename.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleConfirm = () => {
    const asset = filtered.find((a) => a.id === selected);
    if (asset) {
      onSelectAsset(asset);
      onOpenChange(false);
      setSelected(null);
      setSearch("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelected(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[94vw] sm:w-full max-w-2xl max-h-[80vh] flex flex-col p-6 bg-card rounded-2xl border border-line shadow-2xl font-sans gap-0">
        {/* Header */}
        <div className="pb-4 border-b border-line-subtle">
          <DialogTitle className="text-xl font-bold font-display text-ink tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted mt-0.5">
            {description}
          </DialogDescription>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="h-9 w-full rounded-[9px] border border-line bg-canvas pl-8 pr-3 font-sans text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan"
          />
        </div>

        {/* File grid */}
        <div className="flex-1 overflow-y-auto mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0">
          {loading ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center text-muted">
              <ImageIcon size={28} className="mb-2 text-muted-light animate-pulse" />
              <p className="font-sans text-sm font-semibold">Loading assets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center text-muted">
              <ImageIcon size={28} className="mb-2 text-muted-light" />
              <p className="font-sans text-sm font-semibold">No files found</p>
              <p className="text-xs text-muted-light">
                {assets.length === 0
                  ? "Upload a banner file to add it to your library."
                  : "Try clearing your search."}
              </p>
            </div>
          ) : (
            filtered.map((asset) => {
              const isSelected = selected === asset.id;
              const isImage = asset.category === "image";
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelected(asset.id)}
                  className={cn(
                    "relative flex flex-col gap-2 rounded-[12px] border p-3 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-cyan bg-cyan-soft/30 shadow-sm"
                      : "border-line bg-canvas/50 hover:border-cyan/50 hover:bg-cyan-soft/10"
                  )}
                >
                  {/* Thumbnail / icon */}
                  <div className="flex h-24 w-full items-center justify-center rounded-[8px] bg-canvas border border-line overflow-hidden">
                    {isImage && asset.previewUrl ? (
                      <img
                        src={asset.previewUrl}
                        alt={asset.originalFilename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted">
                        {isImage ? (
                          <ImageIcon size={28} weight="bold" />
                        ) : (
                          <FilePdf size={28} weight="bold" className="text-red" />
                        )}
                        <span className="font-mono text-[10px] uppercase">
                          {asset.format}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold text-ink truncate">
                      {asset.originalFilename}
                    </p>
                    <p className="font-sans text-[11px] text-muted">
                      {asset.fileSizeFormatted}
                    </p>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-cyan text-white">
                      <Check size={11} weight="bold" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-line-subtle">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-9 rounded-[8px] border-line text-xs font-semibold text-ink hover:bg-canvas cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={handleConfirm}
            className="h-9 rounded-[8px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-1.5 px-4 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Check size={14} weight="bold" />
            Use Selected File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

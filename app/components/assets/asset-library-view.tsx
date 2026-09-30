"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  FilePdf,
  LockKey,
  MagnifyingGlass,
  X,
  Plus,
  CloudArrowUp,
  Table as TableIcon,
  SquaresFour,
  Eye,
  Copy,
  Check,
  Trash,
  CalendarBlank,
  EnvelopeSimple,
  ShieldCheck,
  FileText,
} from "@phosphor-icons/react";
import { AssetItem, AssetCategory } from "./asset-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AssetLibraryViewProps {
  assets: AssetItem[];
  onSelectAsset: (asset: AssetItem) => void;
  onOpenUpload: () => void;
  onOpenPolicy?: () => void;
  onDirectUpload: (file: File) => void;
  onDeleteAsset: (id: string) => void;
}

type FilterType = "all" | "images" | "documents" | "locked" | "unused";

export function AssetLibraryView({
  assets,
  onSelectAsset,
  onOpenUpload,
  onOpenPolicy,
  onDirectUpload,
  onDeleteAsset,
}: AssetLibraryViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyLink = (e: React.MouseEvent, asset: AssetItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDirectUpload(file);
    }
  };

  // Filter & Search computation
  const filteredAssets = React.useMemo(() => {
    return assets.filter((asset) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        asset.originalFilename.toLowerCase().includes(q) ||
        asset.format.toLowerCase().includes(q) ||
        asset.references.some((r) => r.entityTitle.toLowerCase().includes(q));

      const isLocked = asset.references.length > 0;

      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "images"
          ? asset.category === "image"
          : activeFilter === "documents"
          ? asset.category === "document"
          : activeFilter === "locked"
          ? isLocked
          : !isLocked;

      return matchesSearch && matchesFilter;
    });
  }, [assets, searchQuery, activeFilter]);

  const imagesCount = assets.filter((a) => a.category === "image").length;
  const docsCount = assets.filter((a) => a.category === "document").length;
  const lockedCount = assets.filter((a) => a.references.length > 0).length;
  const unusedCount = assets.filter((a) => a.references.length === 0).length;

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* Hidden input for direct dropzone browse */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onDirectUpload(f);
        }}
      />

      {/* 1. Quick Dropzone Banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-[12px] p-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-colors cursor-pointer",
          isDraggingOver
            ? "border-cyan bg-cyan-soft/40 shadow-xs"
            : "border-line bg-card/60 hover:border-cyan/50 hover:bg-canvas/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-cyan-soft text-cyan flex items-center justify-center shrink-0">
            <CloudArrowUp size={22} weight="bold" />
          </div>
          <div>
            <div className="text-xs font-semibold text-ink font-sans">
              Drop images or PDF attachments here, or{" "}
              <span className="text-cyan underline">browse files</span>
            </div>
            <div className="text-[11px] text-muted font-sans mt-0.5">
              Secure university file storage (JPG, PNG, WebP, or PDF up to 10 MB)
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPolicy?.();
          }}
          className="text-ink hover:text-cyan border-line bg-card hover:bg-canvas text-xs font-semibold rounded-[6px] h-8 px-3.5 gap-1.5 shrink-0 cursor-pointer shadow-2xs"
        >
          <ShieldCheck size={15} weight="bold" className="text-cyan" />
          <span>Asset Policy</span>
        </Button>
      </div>

      {/* 2. Filter Bar & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans",
              activeFilter === "all"
                ? "bg-ink text-paper shadow-xs"
                : "bg-card text-muted hover:text-ink hover:bg-canvas border border-line"
            )}
          >
            All Files ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("images")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans",
              activeFilter === "images"
                ? "bg-cyan text-white shadow-xs"
                : "bg-card text-muted hover:text-ink hover:bg-canvas border border-line"
            )}
          >
            Images ({imagesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("documents")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans",
              activeFilter === "documents"
                ? "bg-red text-white shadow-xs"
                : "bg-card text-muted hover:text-ink hover:bg-canvas border border-line"
            )}
          >
            PDFs ({docsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("locked")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans",
              activeFilter === "locked"
                ? "bg-amber text-white shadow-xs"
                : "bg-card text-muted hover:text-ink hover:bg-canvas border border-line"
            )}
          >
            In Use ({lockedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unused")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans",
              activeFilter === "unused"
                ? "bg-green text-white shadow-xs"
                : "bg-card text-muted hover:text-ink hover:bg-canvas border border-line"
            )}
          >
            Unused ({unusedCount})
          </button>
        </div>

        {/* Search Input & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or event..."
              className="h-9 pl-8.5 pr-8 text-xs bg-card rounded-[8px] border-line font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table / Grid Toggle */}
          <div className="inline-flex rounded-[8px] border border-line p-0.5 bg-canvas/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table View"
              aria-label="Table View"
              className={cn(
                "p-1.5 rounded-[6px] transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-card text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              )}
            >
              <TableIcon size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              aria-label="Grid View"
              className={cn(
                "p-1.5 rounded-[6px] transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-card text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              )}
            >
              <SquaresFour size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Asset Display Area */}
      {viewMode === "table" ? (
        /* TABLE VIEW (Cockpit Density) */
        <div className="bg-card rounded-[12px] border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/40 text-muted font-display text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Asset File</th>
                  <th className="py-3 px-3 font-bold">Format / Size</th>
                  <th className="py-3 px-3 font-bold">Uploaded</th>
                  <th className="py-3 px-3 font-bold">Reference Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {filteredAssets.map((asset) => {
                  const isLocked = asset.references.length > 0;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-canvas/30 transition-colors cursor-pointer group"
                    >
                      {/* File Name & Preview Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 font-display font-bold text-[10px]",
                              asset.category === "image"
                                ? "bg-cyan-soft text-cyan"
                                : "bg-red-soft text-red"
                            )}
                          >
                            {asset.category === "image" ? (
                              <ImageIcon size={18} weight="bold" />
                            ) : (
                              <FilePdf size={18} weight="bold" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink group-hover:text-cyan transition-colors truncate block">
                              {asset.originalFilename}
                            </span>
                            <span className="text-[10px] text-muted truncate block font-mono">
                              {asset.dimensions || (asset.pageCount ? `${asset.pageCount} pages` : "Document")}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Format & Size */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase font-display",
                              asset.category === "image"
                                ? "bg-cyan-soft text-cyan"
                                : "bg-red-soft text-red"
                            )}
                          >
                            {asset.format}
                          </span>
                          <span className="font-medium text-ink">{asset.fileSizeFormatted}</span>
                        </div>
                      </td>

                      {/* Upload Date & Author */}
                      <td className="py-3 px-3">
                        <span className="text-muted block text-[11px] font-sans">
                          {asset.uploadedAt.split(",")[0]}
                        </span>
                        <span className="text-[10px] text-muted block">
                          by {asset.uploadedBy}
                        </span>
                      </td>

                      {/* References / Delete Lock Pill */}
                      <td className="py-3 px-3">
                        {isLocked ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-soft border border-amber-border/80 text-amber text-[10px] font-semibold">
                            <LockKey size={12} weight="bold" />
                            <span>In Use ({asset.references.length})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas border border-line text-muted text-[10px] font-medium">
                            <ShieldCheck size={12} className="text-green" weight="bold" />
                            <span>Unreferenced</span>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCopyLink(e, asset)}
                            className="h-7 w-7 p-0 rounded-[4px] text-muted hover:text-ink cursor-pointer"
                            title="Copy Direct Link"
                          >
                            {copiedId === asset.id ? (
                              <Check size={13} className="text-green" weight="bold" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAsset(asset);
                            }}
                            className="h-7 text-[11px] font-semibold rounded-[4px] border-line px-2.5 hover:bg-canvas cursor-pointer"
                          >
                            Inspect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW (Visual Bento Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isLocked = asset.references.length > 0;
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="bg-card rounded-[12px] border border-line overflow-hidden shadow-2xs hover:border-cyan/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Visual Thumbnail Area */}
                <div className="relative h-36 bg-canvas/60 border-b border-line overflow-hidden flex items-center justify-center p-2">
                  {asset.category === "image" && asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
                      alt={asset.originalFilename}
                      className="h-full w-full object-cover rounded-[6px] group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-red gap-1">
                      <FilePdf size={40} weight="fill" />
                      <span className="text-[10px] font-bold uppercase font-display text-muted">
                        PDF Document
                      </span>
                    </div>
                  )}

                  {/* Format pill badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase font-display shadow-2xs",
                        asset.category === "image"
                          ? "bg-ink/80 text-white backdrop-blur-xs"
                          : "bg-red text-white"
                      )}
                    >
                      {asset.format}
                    </span>
                  </div>

                  {/* Lock Indicator */}
                  {isLocked && (
                    <div className="absolute top-2 right-2">
                      <span className="p-1 rounded-full bg-amber-soft text-amber border border-amber-border flex items-center justify-center shadow-2xs" title="Referenced & Locked">
                        <LockKey size={12} weight="bold" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-3.5 flex flex-col gap-2">
                  <div>
                    <span className="font-semibold text-xs text-ink group-hover:text-cyan transition-colors truncate block">
                      {asset.originalFilename}
                    </span>
                    <span className="text-[10px] text-muted font-sans mt-0.5 block">
                      {asset.fileSizeFormatted} · {asset.uploadedAt.split(",")[0]}
                    </span>
                  </div>

                  {/* References info */}
                  {isLocked ? (
                    <div className="text-[10px] text-amber font-medium truncate flex items-center gap-1 font-sans">
                      <LockKey size={11} weight="bold" className="shrink-0" />
                      <span className="truncate">Used by {asset.references[0]?.entityTitle}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-green font-medium flex items-center gap-1 font-sans">
                      <ShieldCheck size={11} weight="bold" className="shrink-0" />
                      <span>Ready for use</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="p-12 text-center text-xs text-muted bg-card border border-dashed border-line rounded-[12px] flex flex-col items-center justify-center gap-2">
          <FileText size={28} className="text-muted/60" />
          <span className="font-semibold text-ink">No files found matching your search.</span>
          <span>Try adjusting your filter or search keyword.</span>
        </div>
      )}
    </div>
  );
}

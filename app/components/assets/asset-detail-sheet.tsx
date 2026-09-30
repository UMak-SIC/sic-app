"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Image as ImageIcon,
  FilePdf,
  LockKey,
  Copy,
  Check,
  DownloadSimple,
  Trash,
  CalendarBlank,
  EnvelopeSimple,
  ShieldCheck,
  WarningCircle,
  FileText,
  Clock,
  User,
  Fingerprint,
} from "@phosphor-icons/react";
import { AssetItem } from "./asset-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssetDetailSheetProps {
  asset: AssetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteAsset?: (id: string) => void;
}

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  onDeleteAsset,
}: AssetDetailSheetProps) {
  const [copied, setCopied] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!asset) return null;

  const isLocked = asset.references.length > 0;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin + asset.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (isLocked) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteAsset?.(asset.id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full bg-card border-line rounded-[14px] p-0 overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 pr-12 border-b border-line bg-paper flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 font-display font-bold text-xs",
                asset.category === "image"
                  ? "bg-cyan-soft text-cyan"
                  : "bg-red-soft text-red"
              )}
            >
              {asset.category === "image" ? (
                <ImageIcon size={20} weight="bold" />
              ) : (
                <FilePdf size={20} weight="bold" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-display font-bold text-ink tracking-tight truncate">
                {asset.originalFilename}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5 font-sans flex items-center gap-2">
                <span>{asset.fileSizeFormatted}</span>
                <span>·</span>
                <span className="uppercase font-semibold text-ink">{asset.format}</span>
                <span>·</span>
                <span>{asset.uploadedAt}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto flex flex-col gap-5 bg-canvas/30">
          {/* Visual Preview Box */}
          <div className="rounded-[12px] overflow-hidden border border-line bg-paper shadow-2xs">
            {asset.category === "image" && asset.previewUrl ? (
              <div className="relative min-h-[180px] max-h-[260px] bg-ink/90 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={asset.previewUrl}
                  alt={asset.originalFilename}
                  className="max-h-[240px] w-auto object-contain rounded-[6px]"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[4px] bg-ink/80 backdrop-blur-xs text-paper text-[10px] font-mono">
                  {asset.dimensions}
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-center bg-paper">
                <div className="w-14 h-14 rounded-full bg-red-soft flex items-center justify-center text-red">
                  <FilePdf size={32} weight="fill" />
                </div>
                <div className="font-display font-bold text-sm text-ink mt-1">
                  {asset.originalFilename}
                </div>
                <div className="text-xs text-muted font-sans">
                  PDF Document · {asset.pageCount ? `${asset.pageCount} pages · ` : ""}{asset.fileSizeFormatted}
                </div>
              </div>
            )}
          </div>

          {/* Reference Lock Status Card */}
          {isLocked ? (
            <div className="p-4 rounded-[10px] bg-amber-soft border border-amber-border flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-amber font-display font-bold text-xs">
                <LockKey size={16} weight="bold" />
                <span>Delete-Protected: Referenced by {asset.references.length} Active {asset.references.length === 1 ? "Item" : "Items"}</span>
              </div>
              <p className="text-[11px] text-ink/80 font-sans leading-relaxed">
                Deletion is locked to prevent broken banners or missing attachments. To remove this file, unassign it from the referencing events or announcements first.
              </p>

              {/* List of referencing entities */}
              <div className="flex flex-col gap-1.5 pt-1">
                {asset.references.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-2.5 rounded-[6px] bg-card border border-amber-border/70 flex items-center justify-between text-xs font-sans"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ref.entityType === "event" ? (
                        <CalendarBlank size={14} className="text-cyan shrink-0" weight="bold" />
                      ) : (
                        <EnvelopeSimple size={14} className="text-cyan shrink-0" weight="bold" />
                      )}
                      <span className="font-semibold text-ink truncate text-[11px]">
                        {ref.entityTitle}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-canvas text-muted border border-line shrink-0 uppercase">
                      {ref.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-[10px] bg-green-soft border border-green-border flex items-center gap-2 text-xs text-green font-sans">
              <ShieldCheck size={18} weight="bold" className="shrink-0" />
              <span>Unreferenced file. Safe to use in any event or safely delete.</span>
            </div>
          )}

          {/* Technical Metadata Grid */}
          <div className="p-4 bg-card rounded-[12px] border border-line flex flex-col gap-3">
            <h4 className="text-xs font-display font-bold text-ink uppercase tracking-wider">
              File Properties & Storage Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted flex items-center gap-1 font-sans">
                  <Fingerprint size={12} /> File Path:
                </span>
                <span className="font-mono text-[11px] text-ink font-semibold truncate">
                  {asset.objectKey}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted flex items-center gap-1 font-sans">
                  <Clock size={12} /> Upload Timestamp:
                </span>
                <span className="text-ink font-medium font-sans">
                  {asset.uploadedAt}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted flex items-center gap-1 font-sans">
                  <User size={12} /> Uploaded By:
                </span>
                <span className="text-ink font-semibold font-sans">
                  {asset.uploadedBy}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted flex items-center gap-1 font-sans">
                  <FileText size={12} /> File Format:
                </span>
                <span className="font-mono text-[11px] text-ink font-medium">
                  {asset.mediaType}
                </span>
              </div>
            </div>

            {/* Security Verification Code */}
            <div className="pt-2 border-t border-line-subtle flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted font-display">
                Security Verification Code:
              </span>
              <span className="font-mono text-[10px] text-muted select-all bg-canvas/60 p-1.5 rounded-[4px] border border-line break-all">
                {asset.sha256Hash}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-line bg-paper flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Delete Action (Disabled if locked) */}
          {isLocked ? (
            <div className="text-[11px] text-muted flex items-center gap-1 font-sans">
              <LockKey size={13} className="text-amber" />
              <span>Deletion locked while in use</span>
            </div>
          ) : confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red">Confirm delete?</span>
              <Button
                type="button"
                size="sm"
                onClick={handleDelete}
                className="bg-red hover:bg-red-hover text-white text-xs font-semibold rounded-[6px] h-8 px-3"
              >
                Yes, Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="text-xs rounded-[6px] h-8 px-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="text-xs font-semibold text-red hover:bg-red-soft hover:border-red rounded-[6px] h-9 gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Trash size={14} />
              <span>Delete File</span>
            </Button>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyUrl}
              className="text-xs font-semibold rounded-[6px] h-9 px-3 gap-1.5 cursor-pointer border-line"
            >
              {copied ? <Check size={14} className="text-green" weight="bold" /> : <Copy size={14} />}
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </Button>

            <a
              href="/campaign/new"
              className="inline-flex items-center justify-center bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <EnvelopeSimple size={14} weight="bold" />
              <span>Use in Announcement</span>
            </a>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="text-xs font-semibold text-muted hover:text-ink rounded-[6px] h-9 px-3 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

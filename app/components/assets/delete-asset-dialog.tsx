"use client";

import * as React from "react";
import { Trash, WarningCircle, FileText, Image as ImageIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AssetItem } from "@/components/assets/asset-types";

interface DeleteAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetItem | null;
  isDeleting: boolean;
  onConfirm: () => Promise<void> | void;
}

export function DeleteAssetDialog({
  open,
  onOpenChange,
  asset,
  isDeleting,
  onConfirm,
}: DeleteAssetDialogProps) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-red-soft text-red">
            <WarningCircle size={22} weight="bold" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            Delete file?
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
            Delete <strong className="text-ink font-semibold">“{asset.originalFilename}”</strong>? This file will be permanently removed from storage. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-center gap-3 rounded-[9px] border border-line bg-paper p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-cyan-soft text-cyan">
            {asset.category === "image" ? (
              <ImageIcon size={20} weight="bold" aria-hidden="true" />
            ) : (
              <FileText size={20} weight="bold" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold text-ink">{asset.originalFilename}</p>
            <p className="text-muted">
              {asset.fileSizeFormatted} · <span className="uppercase font-medium text-ink">{asset.format}</span> · Uploaded {asset.uploadedAt}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-9 rounded-[6px] border-line text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="h-9 gap-1.5 rounded-[6px] bg-red px-4 text-xs font-semibold text-white shadow-xs hover:bg-red/90 disabled:opacity-50"
          >
            <Trash size={16} weight="bold" aria-hidden="true" />
            {isDeleting ? "Deleting..." : "Delete file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

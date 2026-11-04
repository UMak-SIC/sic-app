"use client";

import * as React from "react";
import { Trash, WarningCircle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { QrLink } from "@/components/qr/qr-client";

interface DeleteQrLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: QrLink | null;
  isDeleting: boolean;
  onConfirm: () => Promise<void> | void;
}

export function DeleteQrLinkDialog({
  open,
  onOpenChange,
  link,
  isDeleting,
  onConfirm,
}: DeleteQrLinkDialogProps) {
  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-red-soft text-red">
            <WarningCircle size={24} weight="bold" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            Delete QR link?
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
            Delete <strong className="text-ink font-semibold">“{link.name}”</strong>? Anyone who scans this QR code or opens this short link will see a notice that the link is no longer available. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[9px] border border-line bg-paper p-3 text-xs text-muted">
          <p className="truncate font-medium text-ink">
            Destination: <span className="text-muted font-normal">{link.destination}</span>
          </p>
          <p className="mt-1">
            Total scans recorded: <strong className="text-ink font-semibold">{link.viewCount}</strong>
          </p>
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
            {isDeleting ? "Deleting..." : "Delete link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

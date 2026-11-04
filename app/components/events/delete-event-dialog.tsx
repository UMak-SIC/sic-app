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
import type { EventItem } from "@/components/events/events-table";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventItem | null;
  isDeleting: boolean;
  onConfirm: () => Promise<void> | void;
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  event,
  isDeleting,
  onConfirm,
}: DeleteEventDialogProps) {
  if (!event) return null;

  const isDraft = event.status === "draft";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-red-soft text-red">
            <WarningCircle size={24} weight="bold" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            {isDraft ? "Delete draft event?" : "Event cannot be deleted"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
            {isDraft ? (
              <>
                Delete <strong className="text-ink font-semibold">“{event.title}”</strong>? This draft event will be permanently removed. This action cannot be undone.
              </>
            ) : (
              <>
                <strong className="text-ink font-semibold">“{event.title}”</strong> is {event.status}. Only draft events without public attendance records can be deleted.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isDraft && event.registeredCount > 0 && (
          <div className="rounded-[9px] border border-amber-border bg-amber-soft p-3 text-xs text-amber">
            <p className="font-semibold text-ink">Registered students will be unlinked</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink/80">
              {event.registeredCount} {event.registeredCount === 1 ? "student is" : "students are"} selected for this draft. Their student records will remain in the directory.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-9 rounded-[6px] border-line text-xs font-semibold"
          >
            {isDraft ? "Cancel" : "Close"}
          </Button>
          {isDraft && (
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={isDeleting}
              className="h-9 gap-1.5 rounded-[6px] bg-red px-4 text-xs font-semibold text-white shadow-xs hover:bg-red/90 disabled:opacity-50"
            >
              <Trash size={16} weight="bold" aria-hidden="true" />
              {isDeleting ? "Deleting..." : "Delete event"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

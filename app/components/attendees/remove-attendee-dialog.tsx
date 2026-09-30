"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash, Warning } from "@phosphor-icons/react";
import { AttendeeSaveError, removeStudent } from "./attendee-writes";
import type { AttendeeItem } from "./attendees-table";

/**
 * Confirms removing a student from the directory.
 *
 * The wording is the point of this dialog. "Delete" on a button implies the record is
 * erased; it is not. The student leaves the directory, and their attendance history
 * stays exactly as it was. Saying that here is the difference between an operator
 * being able to make this decision and having to guess what it does.
 */
interface RemoveAttendeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendee: AttendeeItem | null;
  onRemoved: (attendee: AttendeeItem) => void;
}

export function RemoveAttendeeDialog({
  open,
  onOpenChange,
  attendee,
  onRemoved,
}: RemoveAttendeeDialogProps) {
  // Both start at their reset values, and the page mounts this dialog fresh each time
  // it opens, so there is nothing to clear when it closes.
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (!attendee || isRemoving) return;

    setIsRemoving(true);
    setError(null);

    try {
      await removeStudent(attendee.id);
      onRemoved(attendee);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof AttendeeSaveError || caught instanceof Error
          ? caught.message
          : "That student could not be removed. Check your connection and try again."
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans rounded-[12px] border-line">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold font-display text-ink">
            Remove {attendee?.name ?? "this student"}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted font-sans leading-relaxed">
            {attendee
              ? `${attendee.name} (${attendee.studentId}) will no longer appear in the directory, and cannot be added to an event or checked in.`
              : "This student will no longer appear in the directory."}
          </DialogDescription>
        </DialogHeader>

        {/* What is kept, stated before the button rather than discovered afterwards. */}
        <div className="flex items-start gap-2.5 rounded-[9px] border border-line bg-canvas/60 px-3 py-2.5">
          <Warning size={15} weight="bold" className="text-amber shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink leading-relaxed">
            The record is kept, not erased. The events this student attended stay on
            those events&apos; records, and adding them again brings back everything they
            had.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-ink"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[6px] border-line text-xs font-semibold"
          >
            Keep in Directory
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isRemoving || !attendee}
            className="rounded-[6px] bg-red hover:bg-red-hover text-white text-xs font-semibold gap-1.5 disabled:opacity-50"
          >
            <Trash size={16} weight="bold" />
            <span>{isRemoving ? "Removing…" : "Remove Student"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

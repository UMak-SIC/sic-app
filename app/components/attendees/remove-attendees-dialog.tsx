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
import {
  AttendeeSaveError,
  removeStudent,
  removeStudents,
} from "./attendee-writes";
import type { AttendeeItem } from "./attendees-table";

/**
 * Confirms taking one or several students out of the directory.
 *
 * One component for both, because the wording is the whole point of it and two
 * components would be two wordings to keep honest. "Delete" on a button implies the
 * record is erased; it is not. The students leave the directory and their attendance
 * history stays exactly as it was. Saying that here is the difference between an
 * operator being able to make this decision and having to guess what it does.
 *
 * Several at a time go in one request rather than one each, so the removal either
 * happens for all of them or for none.
 */
interface RemoveAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The students to remove. Empty means there is nothing to confirm. */
  attendees: AttendeeItem[];
  onRemoved: (result: { removed: number; alreadyRemoved: number }) => void;
}

/** Enough names to recognise the selection without becoming a wall of text. */
const NAME_PREVIEW_LIMIT = 5;

export function RemoveAttendeesDialog({
  open,
  onOpenChange,
  attendees,
  onRemoved,
}: RemoveAttendeesDialogProps) {
  // Both start at their reset values, and the page mounts this dialog fresh each time
  // it opens, so there is nothing to clear when it closes.
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const count = attendees.length;
  const isSeveral = count > 1;
  const shown = attendees.slice(0, NAME_PREVIEW_LIMIT);
  const remaining = count - shown.length;

  const handleConfirm = async () => {
    if (count === 0 || isRemoving) return;

    setIsRemoving(true);
    setError(null);

    try {
      // A single student goes through the one-record route so its 404 says "this one
      // is gone" rather than reporting a count of one.
      const result =
        count === 1
          ? { removed: 1, alreadyRemoved: 0, ...(await removeStudent(attendees[0].id)) }
          : await removeStudents(attendees.map((attendee) => attendee.id));

      onRemoved(result);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof AttendeeSaveError || caught instanceof Error
          ? caught.message
          : "Those students could not be removed. Check your connection and try again."
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
            {isSeveral
              ? `Remove ${count} students?`
              : `Remove ${attendees[0]?.name ?? "this student"}?`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted font-sans leading-relaxed">
            {count === 0
              ? "There is nothing selected to remove."
              : isSeveral
                ? `${count} students will no longer appear in the directory, and cannot be added to an event or checked in.`
                : `${attendees[0].name} (${attendees[0].studentId}) will no longer appear in the directory, and cannot be added to an event or checked in.`}
          </DialogDescription>
        </DialogHeader>

        {/* Naming them, so a bulk removal is not confirmed blind. */}
        {count > 0 ? (
          <ul className="mt-1 space-y-1 rounded-[9px] border border-line bg-canvas/60 px-3 py-2.5">
            {shown.map((attendee) => (
              <li key={attendee.id} className="text-[11px] text-ink truncate">
                {attendee.name}
                <span className="text-muted"> &middot; {attendee.studentId}</span>
              </li>
            ))}
            {remaining > 0 ? (
              <li className="text-[11px] text-muted">
                and {remaining} more {remaining === 1 ? "student" : "students"}
              </li>
            ) : null}
          </ul>
        ) : null}

        {/* What is kept, stated before the button rather than discovered afterwards. */}
        <div className="flex items-start gap-2.5 rounded-[9px] border border-line bg-canvas/60 px-3 py-2.5">
          <Warning size={15} weight="bold" className="text-amber shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink leading-relaxed">
            The records are kept, not erased. The events {isSeveral ? "these students" : "this student"}{" "}
            attended stay on those events&apos; records, and{" "}
            {isSeveral ? "adding them" : "adding them"} again brings back{" "}
            {isSeveral ? "everything they had" : "everything they had"}.
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
            disabled={isRemoving || count === 0}
            className="rounded-[6px] bg-red hover:bg-red-hover text-white text-xs font-semibold gap-1.5 disabled:opacity-50"
          >
            <Trash size={16} weight="bold" />
            <span>
              {isRemoving
                ? "Removing…"
                : isSeveral
                  ? `Remove ${count} Students`
                  : "Remove Student"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

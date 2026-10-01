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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarBlank, Check, Users } from "@phosphor-icons/react";

export interface AvailableEvent {
  id: string;
  title: string;
  date: string;
  status: "published" | "draft";
}

interface AddToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  studentNames?: string[];
  onConfirm: (eventId: string) => void;
  /** Real events from the registry. An empty list is shown as an empty state. */
  availableEvents?: AvailableEvent[];
  /** True while the roster request is in flight. */
  submitting?: boolean;
}

export function AddToEventDialog({
  open,
  onOpenChange,
  selectedCount,
  studentNames = [],
  onConfirm,
  availableEvents = [],
  submitting = false,
}: AddToEventDialogProps) {
  // Empty until the caller supplies real events, rather than defaulting to a
  // sample list that would name events the database does not have.
  const [chosenEventId, setChosenEventId] = React.useState<string>("");

  // A choice can outlive the event it names, because the list reloads. Derived
  // rather than corrected in an effect, so a vanished event cannot leave the
  // select holding a value that is not on screen.
  const selectedEventId = availableEvents.some((event) => event.id === chosenEventId)
    ? chosenEventId
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    onConfirm(selectedEventId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line font-sans">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-ink">
              Add to Event
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted">
              Register selected students into an active event participant list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Student selection summary */}
            <div className="flex items-center gap-3 rounded-[9px] border border-cyan-border/60 bg-cyan-soft/40 p-3 text-xs text-ink">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan text-white">
                <Users size={18} weight="bold" />
              </div>
              <div>
                <p className="font-bold">
                  {selectedCount} {selectedCount === 1 ? "student" : "students"} selected
                </p>
                <p className="text-[11px] text-muted">
                  {studentNames.length > 0
                    ? studentNames.slice(0, 2).join(", ") +
                      (studentNames.length > 2
                        ? ` and ${studentNames.length - 2} more`
                        : "")
                    : "Ready to be registered"}
                </p>
              </div>
            </div>

            {/* Event selection */}
            <div className="space-y-1.5">
              <Label htmlFor="event-select" className="text-xs font-bold text-ink">
                Select Target Event
              </Label>
              {availableEvents.length === 0 ? (
                <p className="rounded-[6px] border border-line bg-paper px-3 py-2.5 text-xs text-muted">
                  There are no events yet. Create one on the Events page first.
                </p>
              ) : (
                <Select
                  value={selectedEventId}
                  onValueChange={setChosenEventId}
                >
                  <SelectTrigger id="event-select" className="h-10 rounded-[6px] border-line">
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {availableEvents.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id}>
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarBlank size={14} className="text-muted shrink-0" />
                          <span className="font-medium text-ink truncate">
                            {evt.title}
                          </span>
                          <span className="text-muted-light text-[11px]">
                            ({evt.date})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Adding students creates event registrations with unique entry codes.
              Their attendance track record will update when they check in.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[6px] border-line text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              // Disabled while the request is in flight or with no event chosen, so
              // the button cannot be pressed twice and register the same people
              // under two roster entries.
              disabled={submitting || !selectedEventId}
              className="rounded-[6px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-1.5"
            >
              <Check size={16} weight="bold" />
              <span>{submitting ? "Adding…" : "Confirm & Register"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

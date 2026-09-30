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

const SAMPLE_AVAILABLE_EVENTS: AvailableEvent[] = [
  {
    id: "evt_1",
    title: "UMak SIC General Assembly 2026",
    date: "17 Oct 2026",
    status: "published",
  },
  {
    id: "evt_2",
    title: "Intro to Cloud Computing with AWS & Neon",
    date: "23 Oct 2026",
    status: "published",
  },
  {
    id: "evt_3",
    title: "UI/UX Design Sprint Workshop",
    date: "05 Nov 2026",
    status: "published",
  },
  {
    id: "evt_4",
    title: "UMak Annual Tech Summit 2026",
    date: "18 Nov 2026",
    status: "draft",
  },
];

interface AddToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  studentNames?: string[];
  onConfirm: (eventId: string) => void;
}

export function AddToEventDialog({
  open,
  onOpenChange,
  selectedCount,
  studentNames = [],
  onConfirm,
}: AddToEventDialogProps) {
  const [selectedEventId, setSelectedEventId] = React.useState<string>(
    SAMPLE_AVAILABLE_EVENTS[0].id
  );

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
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger id="event-select" className="h-10 rounded-[6px] border-line">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  {SAMPLE_AVAILABLE_EVENTS.map((evt) => (
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
              className="rounded-[6px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-1.5"
            >
              <Check size={16} weight="bold" />
              <span>Confirm & Register</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

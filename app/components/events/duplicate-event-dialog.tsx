"use client";

import * as React from "react";
import { Copy, MapPin } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventItem } from "@/components/events/events-table";

interface DuplicateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventItem | null;
  isDuplicating: boolean;
  onConfirm: (newName: string, newDate: string) => Promise<void> | void;
}

export function DuplicateEventDialog({
  open,
  onOpenChange,
  event,
  isDuplicating,
  onConfirm,
}: DuplicateEventDialogProps) {
  if (!event) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultTitle = `${event.title} (Copy)`;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = (formData.get("name") as string)?.trim() || defaultTitle;
    const newDate = (formData.get("date") as string) || defaultDate;
    void onConfirm(newName, newDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="flex flex-col gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-cyan-soft text-cyan">
              <Copy size={24} weight="bold" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-ink">
              Duplicate event
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
              Create a new draft event with the details and venue copied from <strong className="text-ink font-semibold">“{event.title}”</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="duplicate-event-name" className="text-xs font-semibold text-ink">
                New event title
              </Label>
              <Input
                id="duplicate-event-name"
                name="name"
                defaultValue={defaultTitle}
                className="h-9 rounded-[6px] border-line bg-card text-xs text-ink"
                placeholder="Event title"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="duplicate-event-date" className="text-xs font-semibold text-ink">
                New event date
              </Label>
              <Input
                id="duplicate-event-date"
                name="date"
                type="date"
                defaultValue={defaultDate}
                className="h-9 rounded-[6px] border-line bg-card text-xs text-ink"
                required
              />
            </div>

            <div className="rounded-[9px] bg-paper p-3 text-xs text-muted border border-line flex items-center gap-2">
              <MapPin size={15} weight="bold" className="text-cyan shrink-0" aria-hidden="true" />
              <span className="truncate">Venue: <strong className="text-ink font-medium">{event.venue}</strong></span>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDuplicating}
              className="h-9 rounded-[6px] border-line text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDuplicating}
              className="h-9 gap-1.5 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover disabled:opacity-50"
            >
              <Copy size={16} weight="bold" aria-hidden="true" />
              {isDuplicating ? "Duplicating..." : "Create draft copy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

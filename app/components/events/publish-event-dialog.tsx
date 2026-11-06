"use client";

import * as React from "react";
import {
  CalendarBlank,
  MapPin,
  PaperPlaneTilt,
  UsersThree,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface PublishableEventInfo {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  rosterCount: number;
}

interface PublishEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PublishableEventInfo | null;
  timezone?: string;
  isPublishing: boolean;
  onConfirm: () => Promise<void> | void;
}

export function PublishEventDialog({
  open,
  onOpenChange,
  event,
  timezone = "the organization timezone",
  isPublishing,
  onConfirm,
}: PublishEventDialogProps) {
  if (!event) return null;

  const dateFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: timezone.includes("timezone") ? undefined : timezone,
  });
  const timeFormat = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone: timezone.includes("timezone") ? undefined : timezone,
  });

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);
  const formattedDate = dateFormat.format(startDate);
  const formattedTime = `${timeFormat.format(startDate)} to ${timeFormat.format(endDate)}`;
  const attendeesLabel = `${event.rosterCount} ${event.rosterCount === 1 ? "student" : "students"} registered`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-cyan-soft text-cyan">
            <PaperPlaneTilt size={24} weight="bold" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            Publish this event?
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
            Review the event schedule and registered attendees before publishing. Once published, this event becomes active for check-in and email announcements.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3 rounded-[9px] border border-line bg-paper p-4 text-xs">
          <div className="border-b border-line pb-2.5">
            <p className="font-display text-sm font-bold text-ink">{event.name}</p>
          </div>

          <div className="flex items-center gap-2 text-ink">
            <CalendarBlank size={16} weight="bold" className="shrink-0 text-cyan" aria-hidden="true" />
            <span>{formattedDate} · {formattedTime}</span>
          </div>

          <div className="flex items-center gap-2 text-ink">
            <MapPin size={16} weight="bold" className="shrink-0 text-cyan" aria-hidden="true" />
            <span>{event.venue ?? "Online event"}</span>
          </div>

          <div className="flex items-center gap-2 text-ink">
            <UsersThree size={16} weight="bold" className="shrink-0 text-cyan" aria-hidden="true" />
            <span>{attendeesLabel}</span>
          </div>
        </div>

        <div className="rounded-[9px] bg-cyan-soft/60 p-3 text-[11px] leading-relaxed text-ink">
          <p className="font-semibold text-cyan">What happens next?</p>
          <p className="mt-0.5 text-muted">
            The event will transition from Draft to Published status. You can launch the camera scanner, and attendees will be eligible to receive valid QR ticket passes.
          </p>
        </div>

        <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
            className="h-9 rounded-[6px] border-line text-xs font-semibold"
          >
            Keep as draft
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isPublishing}
            className="h-9 gap-1.5 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover disabled:opacity-50"
          >
            <PaperPlaneTilt size={16} weight="bold" aria-hidden="true" />
            {isPublishing ? "Publishing..." : "Publish event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

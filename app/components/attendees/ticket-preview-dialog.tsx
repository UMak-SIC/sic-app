"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QrCode, CheckCircle, Clock } from "@phosphor-icons/react";
import { AttendeeItem } from "./attendees-table";

interface TicketPreviewDialogProps {
  attendee: AttendeeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName?: string;
}

export function TicketPreviewDialog({
  attendee,
  open,
  onOpenChange,
  eventName = "UMak SIC General Assembly",
}: TicketPreviewDialogProps) {
  if (!attendee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm font-sans text-center">
        <DialogHeader className="items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-soft text-cyan mb-2">
            <QrCode size={22} weight="bold" />
          </div>
          <DialogTitle className="text-base font-bold text-ink">
            {attendee.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            {eventName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="rounded-xl border border-line bg-canvas/40 p-4 shadow-xs">
            {/* Ticket QR Representation */}
            <div className="relative flex h-40 w-40 items-center justify-center rounded-lg bg-white border border-line p-2">
              <QrCode size={120} weight="duotone" className="text-ink" />
            </div>
            <div className="mt-3 font-mono text-xs font-bold tracking-widest text-cyan">
              {attendee.ticketCode}
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left rounded-lg bg-canvas/30 p-3 text-xs border border-line/60">
            <div>
              <span className="text-muted block text-[10px] uppercase font-semibold">
                Student ID
              </span>
              <span className="font-mono font-medium text-ink">
                {attendee.studentId}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase font-semibold">
                Status
              </span>
              <span className="font-medium capitalize text-ink">
                {attendee.status}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

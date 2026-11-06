"use client";

import * as React from "react";
import { CheckCircle, Clock, UserCheck } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import type { AttendanceStatus } from "@/components/attendance/attendance-status-badge";

export interface QuickCheckinPerson {
  id: string;
  name: string;
  studentId: string;
  email: string;
  attendanceStatus: AttendanceStatus;
  attendedAt: string | null;
}

interface QuickCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: QuickCheckinPerson | null;
  isSaving: boolean;
  onConfirm: (person: QuickCheckinPerson, status: "ATTENDED" | "LATE") => Promise<void> | void;
}

export function QuickCheckinDialog({
  open,
  onOpenChange,
  person,
  isSaving,
  onConfirm,
}: QuickCheckinDialogProps) {
  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-green-soft text-green">
            <UserCheck size={24} weight="bold" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-ink">
            Check in attendee
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted font-sans">
            Confirm gate arrival for this attendee. This immediately records attendance in the official event roster.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-center gap-3 rounded-[9px] border border-line bg-paper p-3.5">
          <ProfileCircle name={person.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{person.name}</p>
            <p className="text-xs text-muted">ID: <span className="font-mono font-medium text-ink">{person.studentId}</span> · {person.email}</p>
          </div>
        </div>

        <div className="rounded-[9px] bg-canvas/70 p-3 text-[11px] text-muted">
          <p>Arrival timestamp will be stamped with the current time.</p>
        </div>

        <DialogFooter className="mt-4 flex flex-row flex-wrap justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-9 rounded-[6px] border-line text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onConfirm(person, "LATE")}
            disabled={isSaving}
            className="h-9 gap-1.5 rounded-[6px] border-amber-border text-amber hover:bg-amber-soft px-3.5 text-xs font-semibold"
          >
            <Clock size={16} weight="bold" aria-hidden="true" />
            <span>Mark as late</span>
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm(person, "ATTENDED")}
            disabled={isSaving}
            className="h-9 gap-1.5 rounded-[6px] bg-green px-4 text-xs font-semibold text-white shadow-xs hover:bg-green/90 disabled:opacity-50"
          >
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            {isSaving ? "Checking in..." : "Mark present"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

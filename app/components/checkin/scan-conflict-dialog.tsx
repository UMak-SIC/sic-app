"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  WarningCircle,
  X,
  ArrowsClockwise,
  User,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ScanConflictDetails {
  title?: string;
  name: string;
  studentId: string;
  course?: string;
  arrivedAt: string;
  message?: string;
}

interface ScanConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ScanConflictDetails | null;
  onContinueScanning?: () => void;
}

export function ScanConflictDialog({
  open,
  onOpenChange,
  conflict,
  onContinueScanning,
}: ScanConflictDialogProps) {
  if (!conflict) return null;

  const handleDismiss = () => {
    onOpenChange(false);
    onContinueScanning?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-amber/40 bg-white p-6 shadow-xl">
        {/* Header with Amber Warning Accent */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber border border-amber-200">
              <Clock size={24} weight="bold" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                {conflict.title || "Already Checked In"}
              </DialogTitle>
              <p className="font-sans text-xs text-slate-500 mt-0.5">
                Duplicate scan detected
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Message Banner */}
        <div className="my-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4">
          <p className="font-sans text-xs leading-relaxed text-amber-900 font-medium">
            {conflict.message ||
              `${conflict.name} was first checked in at ${conflict.arrivedAt}. No second record was created.`}
          </p>
        </div>

        {/* Attendee Info Card */}
        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-slate-500">Student Name</span>
            <strong className="font-sans text-xs font-semibold text-slate-900">
              {conflict.name}
            </strong>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
            <span className="font-sans text-xs text-slate-500">Student ID</span>
            <span className="font-mono text-xs font-medium text-slate-800">
              {conflict.studentId}
            </span>
          </div>
          {conflict.course && (
            <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
              <span className="font-sans text-xs text-slate-500">Program / Degree</span>
              <span className="font-sans text-xs text-slate-800">
                {conflict.course}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
            <span className="font-sans text-xs text-slate-500">Initial Check-in</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-sans text-xs font-bold text-emerald-800">
              <Clock size={12} weight="bold" />
              {conflict.arrivedAt}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan py-2.5 font-sans text-xs font-bold text-white shadow-xs transition-all hover:bg-cyan-dark cursor-pointer"
          >
            <ArrowsClockwise size={16} weight="bold" />
            Continue Scanning
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

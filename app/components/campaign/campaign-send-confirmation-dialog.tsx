"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  PaperPlaneTilt,
  X,
  CalendarBlank,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Signature smooth easing
const EASE = [0.22, 1, 0.36, 1] as const;
const GREEN = "var(--green)";

export interface ChecklistStep {
  id: string;
  label: string;
}

interface CampaignSendConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  subject: string;
  studentCount: number;
  onConfirmSend: () => Promise<void> | void;
}

export function CampaignSendConfirmationDialog({
  open,
  onOpenChange,
  eventName,
  subject,
  studentCount = 114,
  onConfirmSend,
}: CampaignSendConfirmationDialogProps) {
  const reduced = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Default pre-checked items (roster, qr passes, event info)
  const [done, setDone] = React.useState<Set<string>>(
    new Set(["roster", "qr_passes", "event_info"])
  );

  const steps: ChecklistStep[] = React.useMemo(
    () => [
      { id: "roster", label: `${studentCount} students ready` },
      { id: "qr_passes", label: "QR ticket passes included" },
      { id: "event_info", label: "Date & venue confirmed" },
      { id: "test_email", label: "Practice email checked" },
    ],
    [studentCount]
  );

  const toggleStep = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progressShare = done.size / Math.max(1, steps.length);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmSend();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-line rounded-[12px] p-0 overflow-hidden shadow-xl font-sans">
        {/* Header */}
        <div className="p-5 pr-12 border-b border-line bg-paper flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-cyan-soft flex items-center justify-center text-cyan shrink-0">
              <ShieldCheck size={22} weight="bold" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-bold text-ink tracking-tight">
                Ready to Send Email?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5 font-sans">
                Review quick pre-send checklist before broadcasting to students.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Campaign Info Strip */}
        <div className="px-5 pt-4 pb-1 flex flex-col gap-2">
          <div className="p-3 bg-canvas/40 border border-line rounded-[8px] flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-muted">
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                Announcement Details
              </span>
              <span className="font-semibold text-ink font-sans flex items-center gap-1">
                <Users size={13} weight="bold" className="text-cyan" />
                {studentCount} Recipients
              </span>
            </div>
            <div className="font-bold text-ink text-xs font-display truncate">
              {subject || "Event Announcement"}
            </div>
            <div className="text-[11px] text-muted flex items-center gap-1 truncate font-sans">
              <CalendarBlank size={12} />
              <span>{eventName}</span>
            </div>
          </div>
        </div>

        {/* Animated Pre-Flight Checklist */}
        <div className="p-5 pt-3 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold tracking-wider text-muted uppercase font-display">
              Pre-Send Checklist
            </span>
            <span className="tabular-nums text-xs font-bold text-ink font-sans">
              {done.size} / {steps.length} ready
            </span>
          </div>

          {/* Thin Progress Bar */}
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ background: GREEN }}
              animate={{ scaleX: progressShare }}
              initial={false}
              transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }}
            />
          </div>

          {/* Interactive Step Items */}
          <div className="mt-1 flex flex-col gap-1">
            {steps.map((step) => {
              const isChecked = done.has(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  aria-pressed={isChecked}
                  className="group flex items-center gap-3 rounded-[8px] p-2 text-left transition-colors hover:bg-canvas/60 cursor-pointer"
                >
                  <span
                    className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full border transition-colors duration-150"
                    style={{
                      borderColor: isChecked ? "var(--green)" : "var(--line)",
                      background: isChecked ? "var(--green-soft)" : "transparent",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <motion.path
                        d="M1.5 5.2 4 7.6 8.5 2.4"
                        stroke={GREEN}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{
                          pathLength: isChecked ? 1 : 0,
                          opacity: isChecked ? 1 : 0,
                        }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { duration: 0.3, ease: EASE, delay: isChecked ? 0.08 : 0 }
                        }
                      />
                    </svg>
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium font-sans transition-colors duration-200",
                      isChecked ? "text-ink font-semibold" : "text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Helpful safety notice */}
          <div className="mt-1 p-2.5 bg-paper border border-line-subtle rounded-[6px] text-[11px] text-muted font-sans flex items-start gap-1.5">
            <WarningCircle size={14} className="text-amber shrink-0 mt-0.5" />
            <span>Emails and live QR passes will be dispatched immediately to all registered students.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-line bg-paper flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-[6px] h-9 px-3 cursor-pointer border-line"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>
              {isSubmitting ? "Sending..." : `Confirm & Send to ${studentCount} Students`}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

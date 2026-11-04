"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  QrCode,
  Camera,
  ArrowsClockwise,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react";
import { ScannerViewport } from "./scanner-viewport";
import { ManualTicketEntry } from "./manual-ticket-entry";
import { ScanConflictDialog, type ScanConflictDetails } from "./scan-conflict-dialog";
import type { CheckInResponse } from "@/lib/services/checkin-service";

interface LiveCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  totalAttended?: number;
  totalRegistered?: number;
  onCheckinSuccess?: (attendee: NonNullable<CheckInResponse["attendee"]>) => void;
}

export function LiveCheckinDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  totalAttended = 71,
  totalRegistered = 118,
  onCheckinSuccess,
}: LiveCheckinDialogProps) {
  const [mode, setMode] = React.useState<"camera" | "manual">("camera");
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false);
  const [conflictDetails, setConflictDetails] = React.useState<ScanConflictDetails | null>(null);
  const [cameraNotice, setCameraNotice] = React.useState<string | null>(null);

  const [attendedCount, setAttendedCount] = React.useState(totalAttended);
  const [lastCheckIn, setLastCheckIn] = React.useState<CheckInResponse | null>(null);

  const isProcessingRef = React.useRef(false);
  const autoAdvanceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clear auto-advance timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleCameraError = React.useCallback(
    (errorType: "permission" | "unsupported" | "unreadable") => {
      setCameraNotice(
        errorType === "permission"
          ? "Camera access is blocked. Allow the camera in your browser, then try again."
          : errorType === "unsupported"
            ? "This device cannot open the camera. Use Enter Code instead."
            : "The camera could not start. Try switching the camera, or use Enter Code instead.",
      );
    },
    [],
  );

  const handleScanOrCode = React.useCallback(
    async (code: string): Promise<CheckInResponse> => {
      // In-flight gate: avoid flood of requests while previous scan is in progress
      if (isProcessingRef.current) {
        return {
          status: "invalid",
          message: "A check-in is currently processing. Please wait a moment.",
        };
      }

      isProcessingRef.current = true;
      setCameraNotice(null);

      // Cancel any pending auto-advance from previous scan
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }

      try {
        const res = await fetch("/api/checkin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, ticketTokenOrCode: code }),
        });

        const data: CheckInResponse = await res.json();
        setLastCheckIn(data);

        if (data.status === "duplicate" && data.attendee) {
          // Show Conflict Error Modal for duplicate scans
          const formattedTime = data.arrivedAt
            ? new Date(data.arrivedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            : "earlier";

          setConflictDetails({
            title: "Already Checked In",
            name: data.attendee.name,
            studentId: data.attendee.studentId,
            course: data.attendee.course || "BS Information Technology",
            arrivedAt: formattedTime,
            message: `${data.attendee.name} was first checked in at ${formattedTime}. No duplicate record was created.`,
          });
          setConflictDialogOpen(true);
        } else if (data.status === "success" && data.attendee) {
          setAttendedCount((prev) => prev + 1);
          onCheckinSuccess?.(data.attendee);

          // Hands-free continuous scanning: auto-advance after 3 seconds
          autoAdvanceTimerRef.current = setTimeout(() => {
            setLastCheckIn(null);
            autoAdvanceTimerRef.current = null;
          }, 3000);
        }

        return data;
      } catch {
        // The check-in could not reach the server. Say so instead of pretending
        // someone was checked in — attendance was NOT recorded.
        const failedResponse: CheckInResponse = {
          status: "invalid",
          message:
            "We could not reach the check-in service. Check the internet connection, then scan again.",
        };
        setLastCheckIn(failedResponse);
        return failedResponse;
      } finally {
        isProcessingRef.current = false;
      }
    },
    [eventId, onCheckinSuccess],
  );

  const attendee = lastCheckIn?.attendee;
  const initials = attendee?.name
    ? attendee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AS";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[90vh] overflow-y-auto rounded-[16px] border border-line bg-card p-4 sm:p-6 shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <DialogTitle className="font-display text-xl font-bold tracking-tight text-ink">
                Live Check-in Scanner
              </DialogTitle>
              <p className="font-sans text-xs text-muted mt-0.5">
                {eventName} · On-site Operations
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 font-sans text-xs font-bold text-green">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green" />
                In progress
              </span>

              {/* Mode Toggle (Camera vs Manual) */}
              <button
                type="button"
                onClick={() => {
                  setCameraNotice(null);
                  setMode((m) => (m === "camera" ? "manual" : "camera"));
                }}
                className="flex items-center gap-1.5 rounded-[6px] border border-line bg-card px-3 py-1.5 font-sans text-xs font-semibold text-ink transition-colors hover:bg-canvas cursor-pointer"
              >
                {mode === "camera" ? (
                  <>
                    <QrCode size={16} weight="bold" />
                    Enter Code
                  </>
                ) : (
                  <>
                    <Camera size={16} weight="bold" />
                    Use Camera
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Body: 2-Column Cockpit Layout */}
          <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-12">
            {/* Left Column: Viewport / Manual Entry */}
            <div className="lg:col-span-7">
              {mode === "camera" ? (
                <div className="space-y-3">
                  <ScannerViewport onScan={handleScanOrCode} active={open} onError={handleCameraError} />
                  {cameraNotice && (
                    <p
                      className="rounded-[6px] border border-red-border bg-red-soft p-3 font-sans text-xs font-medium text-red"
                      role="alert"
                    >
                      {cameraNotice}
                    </p>
                  )}
                </div>
              ) : (
                <ManualTicketEntry
                  onValidate={handleScanOrCode}
                  className="h-full min-h-[300px]"
                />
              )}
            </div>

            {/* Right Column: Instant Confirmation Card */}
            <div className="flex flex-col justify-between rounded-[12px] border border-line bg-card p-5 shadow-xs lg:col-span-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-cyan-soft font-display text-base font-bold text-cyan-dark">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-ink truncate">
                      {attendee?.name || "Ready for scan"}
                    </h3>
                    <p className="font-sans text-xs text-muted truncate">
                      {attendee?.studentId || "2023-00182"} ·{" "}
                      {attendee?.course || "BS Information Technology"}
                    </p>
                  </div>
                </div>

                {/* Status Pill & Message */}
                {lastCheckIn?.status === "success" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-0.5 font-sans text-xs font-bold text-paper">
                      <CheckCircle size={14} weight="bold" />
                      Attendance recorded
                    </span>
                    <div className="rounded-[9px] border border-cyan-border bg-cyan-muted p-3 font-sans text-xs leading-relaxed text-ink">
                      {lastCheckIn.message ||
                        "Checked in automatically at 2:14 PM. Ready for the next scan."}
                    </div>
                  </div>
                )}

                {lastCheckIn?.status === "duplicate" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-0.5 font-sans text-xs font-bold text-paper">
                      <Clock size={14} weight="bold" />
                      Already checked in
                    </span>
                    <div className="rounded-[9px] border border-amber/30 bg-amber-soft p-3 font-sans text-xs leading-relaxed text-ink">
                      {lastCheckIn.message}
                    </div>
                  </div>
                )}

                {(lastCheckIn?.status === "invalid" || lastCheckIn?.status === "unavailable") && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red px-3 py-0.5 font-sans text-xs font-bold text-paper">
                      <WarningCircle size={14} weight="bold" />
                      Ticket not accepted
                    </span>
                    <div className="rounded-[9px] border border-red-border bg-red-soft p-3 font-sans text-xs leading-relaxed text-ink">
                      {lastCheckIn.message}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress and CTA */}
              <div className="mt-5 space-y-3 border-t border-line pt-3.5">
                <div className="flex items-center justify-between font-sans text-xs text-muted">
                  <span>Turnout progress</span>
                  <span className="font-semibold text-ink">
                    {attendedCount} / {totalRegistered} checked in
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full bg-cyan transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((attendedCount / totalRegistered) * 100))}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (autoAdvanceTimerRef.current) {
                      clearTimeout(autoAdvanceTimerRef.current);
                      autoAdvanceTimerRef.current = null;
                    }
                    setLastCheckIn(null);
                    setCameraNotice(null);
                    setMode("camera");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-cyan py-2.5 font-sans text-xs font-semibold text-paper transition-all hover:bg-cyan-hover cursor-pointer"
                >
                  <ArrowsClockwise size={16} weight="bold" />
                  Scan next attendee
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Scan / Conflict Error Modal */}
      <ScanConflictDialog
        open={conflictDialogOpen}
        onOpenChange={(isOpen) => {
          setConflictDialogOpen(isOpen);
          if (!isOpen) {
            setConflictDetails(null);
            setLastCheckIn(null);
          }
        }}
        conflict={conflictDetails}
      />
    </>
  );
}

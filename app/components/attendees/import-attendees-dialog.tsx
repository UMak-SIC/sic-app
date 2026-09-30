"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Users,
  Trash,
  PencilSimple,
  Table as TableIcon,
} from "@phosphor-icons/react";
import { AttendeeItem, CourseType } from "./attendees-table";
import { AttendeeFileDropzone } from "./attendee-file-dropzone";
import { AttendeeAlertStack, AlertItem } from "./attendee-alert-stack";
import { ImportConflictReview, AttendeeConflict } from "./import-conflict-review";
import { cn } from "@/lib/utils";

export interface AttendeeOverwritePayload {
  id: string;
  updatedData: Partial<AttendeeItem>;
}

interface ImportAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAttendees: AttendeeItem[];
  onImport: (
    newAttendees: Omit<
      AttendeeItem,
      | "id"
      | "assignedEvents"
      | "totalEventsJoined"
      | "attendedEventsCount"
      | "attendanceRate"
      | "joinedDate"
    >[],
    overwrites?: AttendeeOverwritePayload[]
  ) => void;
}

const PROGRAM_NAMES: Record<CourseType, string> = {
  BSIT: "BS Information Technology",
  BSCS: "BS Computer Science",
  BSINS: "BS Information Systems",
};

export function ImportAttendeesDialog({
  open,
  onOpenChange,
  existingAttendees,
  onImport,
}: ImportAttendeesDialogProps) {
  const [step, setStep] = React.useState<"input" | "conflicts">("input");
  const [pasteText, setPasteText] = React.useState<string>(
    `Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph, BSCS\nMiguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph, BSCS\nBianca Flores, 2023-00612, bianca.flores@umak.edu.ph, BSINS\nRafael David, 2021-02914, rafael.david@umak.edu.ph, BSIT`
  );
  const [activeFile, setActiveFile] = React.useState<File | null>(null);
  const [viewMode, setViewMode] = React.useState<"editor" | "preview">("editor");

  // Conflict resolutions state (studentId -> "overwrite" | "keep")
  const [conflictDecisions, setConflictDecisions] = React.useState<Record<string, "overwrite" | "keep">>({});

  // Reset step and state when dialog closes
  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTimeout(() => {
        setStep("input");
        setConflictDecisions({});
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  // Parse lines into normalized students, exact duplicates, and conflicts
  const parsedResults = React.useMemo(() => {
    if (!pasteText.trim()) {
      return {
        valid: [] as Omit<
          AttendeeItem,
          | "id"
          | "assignedEvents"
          | "totalEventsJoined"
          | "attendedEventsCount"
          | "attendanceRate"
          | "joinedDate"
        >[],
        conflicts: [] as AttendeeConflict[],
        exactDuplicates: [] as { name: string; studentId: string; email: string }[],
        invalid: 0,
      };
    }

    const lines = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const validList: Omit<
      AttendeeItem,
      | "id"
      | "assignedEvents"
      | "totalEventsJoined"
      | "attendedEventsCount"
      | "attendanceRate"
      | "joinedDate"
    >[] = [];
    const conflictList: AttendeeConflict[] = [];
    const exactDuplicatesList: { name: string; studentId: string; email: string }[] = [];
    let invalidCount = 0;

    const existingById = new Map<string, AttendeeItem>();
    const existingByEmail = new Map<string, AttendeeItem>();

    existingAttendees.forEach((a) => {
      existingById.set(a.studentId.trim().toLowerCase(), a);
      existingByEmail.set(a.email.trim().toLowerCase(), a);
    });

    const seenBatchIds = new Set<string>();
    const seenBatchEmails = new Set<string>();

    for (const line of lines) {
      // Skip header line
      if (
        line.toLowerCase().includes("student id") ||
        (line.toLowerCase().includes("email") && line.toLowerCase().includes("course"))
      ) {
        continue;
      }

      // Supports comma or tab separation
      const parts = line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : line.split(",").map((p) => p.trim());

      if (parts.length >= 3) {
        const name = parts[0];
        const studentId = parts[1];
        const email = parts[2].toLowerCase(); // Normalize email
        const courseStr = parts[3] || "";

        let course: CourseType = "BSIT";
        if (courseStr) {
          const upper = courseStr.toUpperCase();
          if (upper.includes("CS") || upper.includes("COMPUTER")) course = "BSCS";
          else if (
            upper.includes("INS") ||
            upper.includes("IS") ||
            upper.includes("SYSTEM")
          )
            course = "BSINS";
          else course = "BSIT";
        }

        const idKey = studentId.toLowerCase();
        const emailKey = email.toLowerCase();

        // Check if already exists in master directory
        const matchedExisting = existingById.get(idKey) || existingByEmail.get(emailKey);

        if (matchedExisting) {
          // Check if identical or has conflicting/updated fields
          const differingFields: Array<"name" | "course" | "email"> = [];
          if (matchedExisting.name.trim().toLowerCase() !== name.toLowerCase()) {
            differingFields.push("name");
          }
          if (matchedExisting.course !== course) {
            differingFields.push("course");
          }
          if (matchedExisting.email.trim().toLowerCase() !== emailKey) {
            differingFields.push("email");
          }

          if (differingFields.length > 0) {
            // Found a conflict / update
            const userDecision = conflictDecisions[matchedExisting.id] || "overwrite";
            conflictList.push({
              id: matchedExisting.id,
              existing: matchedExisting,
              incoming: {
                name,
                studentId,
                email,
                course,
                program: PROGRAM_NAMES[course],
              },
              differingFields,
              decision: userDecision,
            });
          } else {
            // Exact identical duplicate
            exactDuplicatesList.push({ name, studentId, email });
          }
        } else if (seenBatchIds.has(idKey) || seenBatchEmails.has(emailKey)) {
          // Duplicate within current batch
          exactDuplicatesList.push({ name, studentId, email });
        } else {
          seenBatchIds.add(idKey);
          seenBatchEmails.add(emailKey);
          validList.push({
            name,
            studentId,
            email,
            course,
            program: PROGRAM_NAMES[course],
          });
        }
      } else {
        invalidCount++;
      }
    }

    return {
      valid: validList,
      conflicts: conflictList,
      exactDuplicates: exactDuplicatesList,
      invalid: invalidCount,
    };
  }, [pasteText, existingAttendees, conflictDecisions]);

  // AlertStack messages
  const dynamicAlerts: AlertItem[] = React.useMemo(() => {
    const alerts: AlertItem[] = [];

    if (parsedResults.valid.length > 0) {
      alerts.push({
        id: "valid-candidates-alert",
        type: "success",
        message: `${parsedResults.valid.length} new ${
          parsedResults.valid.length === 1 ? "student" : "students"
        } ready to add.`,
      });
    }

    if (parsedResults.conflicts.length > 0) {
      alerts.push({
        id: "conflict-candidates-alert",
        type: "warning",
        message: `${parsedResults.conflicts.length} ${
          parsedResults.conflicts.length === 1 ? "student has" : "students have"
        } updated details to review.`,
      });
    }

    if (parsedResults.exactDuplicates.length > 0) {
      alerts.push({
        id: "duplicate-candidates-alert",
        type: "neutral",
        message: `${parsedResults.exactDuplicates.length} identical ${
          parsedResults.exactDuplicates.length === 1 ? "record" : "records"
        } skipped.`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "empty-helper-alert",
        type: "info",
        message: "Upload a CSV file or paste attendee records to begin.",
      });
    }

    return alerts;
  }, [parsedResults]);

  // Handle file select from dropzone
  const handleFileSelect = (file: File | null, content?: string) => {
    setActiveFile(file);
    if (content !== undefined) {
      setPasteText(content);
    }
  };

  // Handle text load from past events
  const handleLoadRosterText = (text: string) => {
    setPasteText(text);
  };

  // Remove individual candidate row from raw text
  const handleRemoveCandidate = (studentId: string) => {
    const lines = pasteText
      .split("\n")
      .filter((line) => !line.includes(studentId));
    setPasteText(lines.join("\n"));
  };

  // Update conflict decision for a single student
  const handleUpdateDecision = (studentId: string, decision: "overwrite" | "keep") => {
    setConflictDecisions((prev) => ({
      ...prev,
      [studentId]: decision,
    }));
  };

  // Update conflict decisions for all students
  const handleUpdateAllDecisions = (decision: "overwrite" | "keep") => {
    const next: Record<string, "overwrite" | "keep"> = {};
    parsedResults.conflicts.forEach((c) => {
      next[c.existing.id] = decision;
    });
    setConflictDecisions(next);
  };

  // Final apply or proceed to conflict review step
  const handleProceed = () => {
    if (step === "input") {
      if (parsedResults.conflicts.length > 0) {
        setStep("conflicts");
        return;
      }
      // No conflicts: direct import
      if (parsedResults.valid.length > 0) {
        onImport(parsedResults.valid, []);
        handleDialogChange(false);
      }
      return;
    }

    // Step === "conflicts": compile overwrites & additions
    const overwrites: AttendeeOverwritePayload[] = parsedResults.conflicts
      .filter((c) => (conflictDecisions[c.existing.id] || "overwrite") === "overwrite")
      .map((c) => ({
        id: c.existing.id,
        updatedData: {
          name: c.incoming.name,
          course: c.incoming.course,
          program: c.incoming.program,
          email: c.incoming.email,
        },
      }));

    onImport(parsedResults.valid, overwrites);
    handleDialogChange(false);
  };

  const totalCandidateCount = parsedResults.valid.length + parsedResults.conflicts.length;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-[94vw] sm:w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 bg-card rounded-2xl sm:rounded-3xl border border-line shadow-2xl font-sans">
        {/* Header */}
        <div className="pb-4 border-b border-line-subtle">
          <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
            {step === "conflicts" ? "Review Import Conflicts" : "Import Attendees"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted font-sans mt-0.5">
            {step === "conflicts"
              ? "Review and approve changes before updating the student directory."
              : "Add students to the directory via CSV or pasted list."}
          </DialogDescription>
        </div>

        {/* Step 2: Screen 14 Conflict Review */}
        {step === "conflicts" ? (
          <div className="pt-3">
            <ImportConflictReview
              conflicts={parsedResults.conflicts}
              onUpdateDecision={handleUpdateDecision}
              onUpdateAllDecisions={handleUpdateAllDecisions}
              onBack={() => setStep("input")}
              onConfirm={handleProceed}
              validNewCount={parsedResults.valid.length}
            />
          </div>
        ) : (
          /* Step 1: Input Ingestion & Preview */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start pt-2">
            {/* Left Column (6 cols): File Dropzone */}
            <div className="md:col-span-6 h-full flex flex-col">
              <AttendeeFileDropzone
                file={activeFile}
                onFileSelect={handleFileSelect}
                onLoadRosterText={handleLoadRosterText}
                parsedCount={totalCandidateCount}
              />
            </div>

            {/* Right Column (6 cols): Data Normalizer, AlertStack & Candidate Cockpit */}
            <div className="md:col-span-6 flex flex-col justify-between min-h-[380px] gap-4">
              {/* View Mode Toggle: Text Editor vs Candidate Roster */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="paste-attendee-list"
                  className="text-xs font-bold text-ink flex items-center gap-1.5"
                >
                  <span>Paste attendee list</span>
                  {totalCandidateCount > 0 && (
                    <span className="text-[11px] font-normal text-muted">
                      ({totalCandidateCount} records found)
                    </span>
                  )}
                </Label>

                <div className="flex items-center gap-1 p-0.5 bg-canvas rounded-[8px] border border-line text-[11px]">
                  <button
                    type="button"
                    onClick={() => setViewMode("editor")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-semibold transition-all cursor-pointer",
                      viewMode === "editor"
                        ? "bg-card text-ink shadow-2xs"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    <PencilSimple size={13} weight={viewMode === "editor" ? "bold" : "regular"} />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-semibold transition-all cursor-pointer",
                      viewMode === "preview"
                        ? "bg-card text-ink shadow-2xs"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    <TableIcon size={13} weight={viewMode === "preview" ? "bold" : "regular"} />
                    <span>Review ({totalCandidateCount})</span>
                  </button>
                </div>
              </div>

              {/* View Mode 1: Multi-line Editor */}
              {viewMode === "editor" ? (
                <div className="space-y-1 flex-1 flex flex-col">
                  <textarea
                    id="paste-attendee-list"
                    rows={6}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph, BSIT\nMiguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph, BSCS\nBianca Flores, 2023-00612, bianca.flores@umak.edu.ph, BSINS`}
                    className="w-full rounded-[12px] border border-line bg-card p-3.5 font-mono text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan resize-none leading-relaxed transition-all shadow-2xs flex-1 min-h-[160px]"
                  />
                </div>
              ) : (
                /* View Mode 2: Candidate Roster Preview */
                <div className="flex-1 flex flex-col gap-2 rounded-[12px] border border-line bg-canvas/30 p-3 min-h-[160px] max-h-[220px] overflow-y-auto">
                  {totalCandidateCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-6 text-center text-muted">
                      <Users size={24} className="mb-1 text-muted-light" />
                      <p className="text-xs font-semibold">No valid candidates found</p>
                      <p className="text-[11px] text-muted-light">
                        Check your input format in the editor tab.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Valid New Records */}
                      {parsedResults.valid.map((item) => (
                        <div
                          key={item.studentId}
                          className="flex items-center justify-between p-2 rounded-[8px] bg-card border border-line shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-cyan font-bold text-[11px]">
                              {item.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate leading-tight">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {item.studentId} · {item.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border-cyan/30 text-cyan bg-cyan-soft/40"
                            >
                              {item.course}
                            </Badge>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => handleRemoveCandidate(item.studentId)}
                              className="p-1 text-muted hover:text-red hover:bg-red-soft/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Conflicted Records Preview */}
                      {parsedResults.conflicts.map((conflict) => (
                        <div
                          key={conflict.existing.id}
                          className="flex items-center justify-between p-2 rounded-[8px] bg-amber-soft/30 border border-amber/30 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-white font-bold text-[11px]">
                              !
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate leading-tight">
                                {conflict.incoming.name}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {conflict.existing.studentId} · Differs from saved profile
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border-amber/40 text-amber bg-card"
                            >
                              Conflict
                            </Badge>
                            <button
                              type="button"
                              aria-label={`Remove ${conflict.incoming.name}`}
                              onClick={() => handleRemoveCandidate(conflict.existing.studentId)}
                              className="p-1 text-muted hover:text-red hover:bg-red-soft/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AlertStack */}
              <div className="pt-1">
                <AttendeeAlertStack alerts={dynamicAlerts} />
              </div>

              {/* Bottom Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-line-subtle mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  className="h-10 rounded-[9px] border-line text-xs font-semibold text-ink hover:bg-canvas cursor-pointer shadow-2xs"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={totalCandidateCount === 0}
                  onClick={handleProceed}
                  className="h-10 rounded-[9px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-2 px-5 cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <UserPlus size={16} weight="bold" />
                  <span>
                    {parsedResults.conflicts.length > 0
                      ? `Review Conflicts (${parsedResults.conflicts.length})`
                      : `Save and Import (${parsedResults.valid.length})`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
import { UserPlus, Users, Trash, PencilSimple, Table as TableIcon } from "@phosphor-icons/react";
import { AttendeeFileDropzone } from "./attendee-file-dropzone";
import { AttendeeAlertStack, AlertItem } from "./attendee-alert-stack";
import { ImportReview } from "./import-review";
import {
  approvedRowsFor,
  commitImport,
  pendingCountFor,
  previewImport,
  type ImportMode,
  type RowDecision,
} from "./attendee-import";
import { cn } from "@/lib/utils";

/**
 * Import dialog.
 *
 * All the rules live on the server. This used to parse the pasted text, match it
 * against a copy of the registry, decide what was new and what was a conflict, and
 * hand the result to the page to write locally. That meant three implementations
 * of the same rules and a preview that could disagree with what was then saved.
 *
 * Now the text goes to `/api/attendees/import/preview`, the screen shows what came
 * back, and the operator's choices go back as a list of row numbers to
 * `/api/attendees/import/commit`. The browser never decides what a row means.
 */

/** Matches the directory search, so typing does not fire a request per keystroke. */
const PREVIEW_DEBOUNCE_MS = 300;

const SAMPLE_TEXT = `Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph, BSCS
Miguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph, BSCS
Bianca Flores, 2023-00612, bianca.flores@umak.edu.ph, BSINS
Rafael David, 2021-02914, rafael.david@umak.edu.ph, BSIT`;

interface ImportAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful commit, so the page can re-read the directory. */
  onImported: () => void;
}

export function ImportAttendeesDialog({
  open,
  onOpenChange,
  onImported,
}: ImportAttendeesDialogProps) {
  const [step, setStep] = React.useState<"input" | "review">("input");
  const [pasteText, setPasteText] = React.useState<string>(SAMPLE_TEXT);
  const [activeFile, setActiveFile] = React.useState<File | null>(null);
  const [viewMode, setViewMode] = React.useState<"editor" | "preview">("editor");

  /**
   * A pasted list is parsed as pasted text and an uploaded file as CSV, which is
   * the only difference between them. Tracked as state rather than inferred from
   * the file name so an empty file still reports as CSV.
   */
  const [mode, setMode] = React.useState<ImportMode>("paste");

  const [previewed, setPreviewed] = React.useState<{
    key: string;
    value: Awaited<ReturnType<typeof previewImport>>;
  } | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const [decisions, setDecisions] = React.useState<Record<number, RowDecision>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  /**
   * Identifies the list a preview describes.
   *
   * The preview is stored against this key rather than cleared when the text
   * changes. Clearing inside the effect would be a synchronous state write on every
   * render pass, and it would also blank the screen for a moment each time the text
   * changes, instead of continuing to show the previous answer until a new one
   * arrives. Deriving it means a stale preview simply stops matching.
   */
  const previewKey = `${mode}\u0000${pasteText.trim()}`;

  /** The preview for the list on screen, or null when there is not one yet. */
  const preview = previewed?.key === previewKey ? previewed.value : null;

  /** True only while the request for the list on screen is in flight. */
  const isPreviewing = busyKey === previewKey;

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Deferred so the closing animation is not interrupted, and so the reset is
      // not applied to a dialog that is still mounted and visible.
      setTimeout(() => {
        setStep("input");
        setDecisions({});
        setPreviewed(null);
        setBusyKey(null);
        setPreviewError(null);
        setSubmitError(null);
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  // Ask the server what the list means, shortly after typing stops. The previous
  // request is aborted rather than left to finish, so a slow early response cannot
  // overwrite a newer one.
  React.useEffect(() => {
    if (!open || !pasteText.trim()) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      setBusyKey(previewKey);

      previewImport({ mode, content: pasteText, signal: controller.signal })
        .then((result) => {
          setPreviewed({ key: previewKey, value: result });
          setPreviewError(null);
          setBusyKey(null);
        })
        .catch((error: unknown) => {
          // An abort is a keystroke, not a failure, so it leaves the previous
          // answer alone rather than reporting a problem the operator did not cause.
          if (controller.signal.aborted) return;

          setPreviewed(null);
          setPreviewError(
            error instanceof Error
              ? error.message
              : "That list could not be read. Check the format and try again."
          );
          setBusyKey(null);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, mode, pasteText, previewKey]);

  /**
   * Clearing on edit rather than inside the preview effect: a re-render must not
   * discard choices the operator has already made, but new text invalidates them
   * because the row numbers refer to a different list.
   */
  const handleTextChange = (next: string) => {
    setPasteText(next);
    setDecisions({});
    setSubmitError(null);
  };

  const handleFileSelect = (file: File | null, content?: string) => {
    setActiveFile(file);
    setMode(file ? "csv" : "paste");
    setDecisions({});
    setSubmitError(null);

    if (content !== undefined) {
      setPasteText(content);
    }
  };

  const handleLoadRosterText = (text: string) => {
    // Roster text pasted in from a past event is still a pasted list, not a CSV.
    setMode("paste");
    setPasteText(text);
    setDecisions({});
  };

  const handleRemoveRow = (row: number) => {
    // A row is identified by its position in the list, so removing one means
    // rewriting the text without it. The server re-numbers on the next preview.
    handleTextChange(
      pasteText
        .split("\n")
        .filter((_, index) => index !== row - 1)
        .join("\n")
    );
  };

  const handleUpdateDecision = (row: number, decision: RowDecision) => {
    setDecisions((previous) => ({ ...previous, [row]: decision }));
  };

  const handleUpdateAllDecisions = (decision: RowDecision) => {
    if (!preview) return;

    setDecisions(
      Object.fromEntries(preview.preview.updates.map((update) => [update.record.row, decision]))
    );
  };

  const summary = preview?.summary;

  const newCount = summary?.newCount ?? 0;
  const updateCount = summary?.updateCount ?? 0;
  const conflictCount = summary?.conflictCount ?? 0;
  const withheldCount = summary?.withheldCount ?? 0;
  const malformedCount = summary?.malformed ?? 0;

  /**
   * Rows that match a student on file and would change something.
   *
   * The server counts every matched row as an update, including one that already
   * agrees with the directory. Those need no decision, so they are kept out of the
   * count of things to review rather than being announced as changes that are not
   * changes.
   */
  const reviewableUpdateCount =
    preview?.preview.updates.filter((update) => update.changes.length > 0).length ?? 0;

  /**
   * What would be written if the operator pressed the button now, and the rows that
   * decision amounts to. Both are the same question asked two ways, so they come
   * from one function rather than from two counts kept in step by hand.
   */
  const pendingCount = preview ? pendingCountFor(preview, decisions) : 0;

  const rowsTheServerAccepts = preview?.approvableRows.length ?? 0;

  /**
   * The button says what pressing it will do, including when that is nothing.
   *
   * A list made entirely of rows the server will not touch — a paste of addresses
   * nobody is on yet — would otherwise offer "Save and Import (0)" and refuse to
   * work, which reads as a broken button rather than as a real answer.
   */
  const buttonLabel = React.useMemo(() => {
    if (!preview) return "Save and Import";

    if (reviewableUpdateCount > 0 || conflictCount > 0) {
      return `Review (${reviewableUpdateCount + conflictCount})`;
    }

    if (rowsTheServerAccepts === 0) {
      return withheldCount > 0 ? "Nothing to import yet" : "Nothing to import";
    }

    return `Save and Import (${newCount})`;
  }, [preview, reviewableUpdateCount, conflictCount, rowsTheServerAccepts, withheldCount, newCount]);

  const handleProceed = async () => {
    if (!preview) return;

    // A list with nothing to decide about goes straight in. Otherwise the operator
    // sees what would change first, even if they would keep all of it.
    if (step === "input" && (reviewableUpdateCount > 0 || conflictCount > 0)) {
      setStep("review");
      return;
    }

    const approvedRows = approvedRowsFor(preview, decisions);

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await commitImport({ mode, content: pasteText, approvedRows });
      handleDialogChange(false);
      onImported();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Those students could not be imported. Try again."
      );
      setStep("review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicAlerts: AlertItem[] = React.useMemo(() => {
    const alerts: AlertItem[] = [];

    if (newCount > 0) {
      alerts.push({
        id: "new-students",
        type: "success",
        message: `${newCount} new ${newCount === 1 ? "student" : "students"} ready to add.`,
      });
    }

    if (reviewableUpdateCount > 0) {
      alerts.push({
        id: "updated-students",
        type: "warning",
        message: `${reviewableUpdateCount} ${
          reviewableUpdateCount === 1 ? "student has" : "students have"
        } changed details to review.`,
      });
    }

    if (conflictCount > 0) {
      alerts.push({
        id: "conflicting-rows",
        type: "error",
        message: `${conflictCount} ${conflictCount === 1 ? "row" : "rows"} cannot be imported.`,
      });
    }

    if (malformedCount > 0 || withheldCount > 0) {
      alerts.push({
        id: "unreadable-rows",
        type: "neutral",
        message: `${malformedCount + withheldCount} ${
          malformedCount + withheldCount === 1 ? "row" : "rows"
        } could not be read.`,
      });
    }

    return alerts;
  }, [newCount, reviewableUpdateCount, conflictCount, malformedCount, withheldCount]);

  const isBusy = isPreviewing || isSubmitting;
  const totalCandidateCount = newCount + updateCount + conflictCount;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-[94vw] sm:w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 bg-card rounded-2xl sm:rounded-3xl border border-line shadow-2xl font-sans">
        <div className="pb-4 border-b border-line-subtle">
          <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
            {step === "review" ? "Review Import" : "Import Attendees"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted font-sans mt-0.5">
            {step === "review"
              ? "Review and approve changes before updating the student directory."
              : "Add students to the directory via CSV or pasted list."}
          </DialogDescription>
        </div>

        {step === "review" && preview ? (
          <div className="pt-3">
            <ImportReview
              preview={preview}
              decisions={decisions}
              onUpdateDecision={handleUpdateDecision}
              onUpdateAllDecisions={handleUpdateAllDecisions}
              onBack={() => setStep("input")}
              onConfirm={handleProceed}
              pendingCount={pendingCount}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start pt-2">
            <div className="md:col-span-6 h-full flex flex-col">
              <AttendeeFileDropzone
                file={activeFile}
                onFileSelect={handleFileSelect}
                onLoadRosterText={handleLoadRosterText}
                parsedCount={totalCandidateCount}
              />
            </div>

            <div className="md:col-span-6 flex flex-col justify-between min-h-[380px] gap-4">
              {/*
                Said up front rather than only as a failure afterwards: a pasted
                list can change students who are already in the directory but cannot
                add anyone, and finding that out by pressing the button would look
                like the button was broken.
              */}
              {mode === "paste" ? (
                <p className="rounded-[6px] border border-line bg-canvas/60 px-3 py-2 text-[11px] text-muted leading-snug">
                  A pasted list can update students who are already in the directory.
                  To add new students, upload a spreadsheet.
                </p>
              ) : null}

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="paste-attendee-list"
                  className="text-xs font-bold text-ink flex items-center gap-1.5"
                >
                  <span>Paste attendee list</span>
                  {totalCandidateCount > 0 ? (
                    <span className="text-[11px] font-normal text-muted">
                      ({totalCandidateCount} records found)
                    </span>
                  ) : null}
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

              {viewMode === "editor" ? (
                <div className="space-y-1 flex-1 flex flex-col">
                  <textarea
                    id="paste-attendee-list"
                    rows={6}
                    value={pasteText}
                    onChange={(event) => handleTextChange(event.target.value)}
                    placeholder={SAMPLE_TEXT}
                    aria-describedby="import-preview-status"
                    className="w-full rounded-[12px] border border-line bg-card p-3.5 font-mono text-xs text-ink placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-cyan/20 focus:border-cyan resize-none leading-relaxed transition-all shadow-2xs flex-1 min-h-[160px]"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2 rounded-[12px] border border-line bg-canvas/30 p-3 min-h-[160px] max-h-[220px] overflow-y-auto">
                  {!preview ? (
                    <div className="flex flex-col items-center justify-center h-full py-6 text-center text-muted">
                      <Users size={24} className="mb-1 text-muted-light" />
                      <p className="text-xs font-semibold">
                        {isPreviewing ? "Reading the list…" : "Nothing to review yet"}
                      </p>
                      <p className="text-[11px] text-muted-light">
                        {isPreviewing
                          ? "Checking the list against the directory."
                          : "Paste a list or choose a file first."}
                      </p>
                    </div>
                  ) : totalCandidateCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-6 text-center text-muted">
                      <Users size={24} className="mb-1 text-muted-light" />
                      <p className="text-xs font-semibold">No students found</p>
                      <p className="text-[11px] text-muted-light">
                        Check the format in the editor tab.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {preview.preview.newAttendees.map((record) => (
                        <div
                          key={record.row}
                          className="flex items-center justify-between p-2 rounded-[8px] bg-card border border-line shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-cyan font-bold text-[11px]">
                              {initials(record.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate leading-tight">
                                {record.name ?? record.displayEmail}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {record.studentId ? `${record.studentId} · ` : ""}
                                {record.displayEmail}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {record.course ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border-cyan/30 text-cyan bg-cyan-soft/40"
                              >
                                {record.course}
                              </Badge>
                            ) : null}
                            <button
                              type="button"
                              aria-label={`Remove ${record.name ?? record.displayEmail}`}
                              onClick={() => handleRemoveRow(record.row)}
                              className="p-1 text-muted hover:text-red hover:bg-red-soft/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {preview.preview.updates.map((update) => (
                        <div
                          key={update.record.row}
                          className="flex items-center justify-between p-2 rounded-[8px] bg-amber-soft/30 border border-amber/30 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-white font-bold text-[11px]">
                              !
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate leading-tight">
                                {update.record.name ?? update.record.displayEmail}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                {update.record.studentId
                                  ? `${update.record.studentId} · `
                                  : ""}
                                {update.changes.length === 0
                                  ? "Already up to date"
                                  : `${update.changes.length} ${
                                      update.changes.length === 1 ? "field" : "fields"
                                    } differ`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border-amber/40 text-amber bg-card"
                            >
                              {update.changes.length === 0 ? "No change" : "Review"}
                            </Badge>
                            <button
                              type="button"
                              aria-label={`Remove ${update.record.name ?? update.record.displayEmail}`}
                              onClick={() => handleRemoveRow(update.record.row)}
                              className="p-1 text-muted hover:text-red hover:bg-red-soft/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {preview.preview.conflicts.map((conflict) => (
                        <div
                          key={conflict.record.row}
                          className="flex items-center justify-between p-2 rounded-[8px] bg-red-soft/30 border border-red/30 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red text-white font-bold text-[11px]">
                              !
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate leading-tight">
                                {conflict.record.name ?? conflict.record.displayEmail}
                              </p>
                              <p className="text-[11px] text-muted truncate">
                                Cannot be imported
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label={`Remove ${conflict.record.name ?? conflict.record.displayEmail}`}
                            onClick={() => handleRemoveRow(conflict.record.row)}
                            className="p-1 text-muted hover:text-red hover:bg-red-soft/40 rounded transition-colors cursor-pointer shrink-0"
                          >
                            <Trash size={13} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* One live region for the preview's state, so the count, any problem
                  and the busy state are all announced rather than only the count. */}
              <div id="import-preview-status" role="status" className="pt-1 space-y-2">
                <AttendeeAlertStack alerts={dynamicAlerts} />
                {previewError ? (
                  <p className="rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-ink">
                    {previewError}
                  </p>
                ) : null}
                {submitError ? (
                  <p className="rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-ink">
                    {submitError}
                  </p>
                ) : null}
              </div>

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
                  disabled={rowsTheServerAccepts === 0 || isBusy}
                  onClick={handleProceed}
                  className="h-10 rounded-[9px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-2 px-5 cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <UserPlus size={16} weight="bold" />
                  <span>
                    {isSubmitting
                      ? "Importing…"
                      : isPreviewing
                        ? "Reading…"
                        : buttonLabel}
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

function initials(name: string | null): string {
  if (!name) return "?";

  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

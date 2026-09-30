"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCheck, Warning, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  defaultDecision,
  type ExistingAttendee,
  type ImportField,
  type ImportPreview,
  type RowDecision,
} from "./attendee-import";

/**
 * Review step of the import: what would change, and what cannot be changed at all.
 *
 * Two different situations arrive here and they are not treated as the same kind of
 * choice. A row that matches a student already on file is a decision the operator
 * can make: keep what is saved, or take what the list says. A row that matches two
 * different students, or repeats another row in the same file, is not a decision
 * anybody can make from this screen, so it is shown as a reason and left alone.
 * The old version offered a "keep or overwrite" choice for both, which promised a
 * resolution the server would not honour.
 */

export type { RowDecision };

/** Plain-language labels. The API speaks in field names, the screen does not. */
const FIELD_LABELS: Record<ImportField, string> = {
  name: "Full name",
  displayEmail: "Email",
  studentId: "Student number",
  course: "Course",
  program: "Program",
  section: "Section",
};

const MATCHED_BY: Record<"studentId" | "email" | "both", string> = {
  studentId: "matched on student number",
  email: "matched on email",
  both: "matched on student number and email",
};

/** Never shows a blank cell, because a blank reads as a bug rather than as "not set". */
function readable(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "Not set";
  }

  return value;
}

function CandidateList({ candidates }: { candidates: ExistingAttendee[] }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {candidates.map((candidate) => (
        <li
          key={candidate.id}
          className="rounded-[6px] border border-line bg-canvas px-2 py-1 text-[11px] text-ink"
        >
          <span className="font-semibold">{candidate.name}</span>
          <span className="text-muted">
            {" "}
            &middot; {candidate.studentId} &middot; {candidate.displayEmail}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface ImportReviewProps {
  preview: ImportPreview;
  /** Chosen per row number, which is the only identifier the commit route accepts. */
  decisions: Record<number, RowDecision>;
  onUpdateDecision: (row: number, decision: RowDecision) => void;
  onUpdateAllDecisions: (decision: RowDecision) => void;
  onBack: () => void;
  onConfirm: () => void;
  /** New students plus the updates chosen to be taken. Drives the button's count. */
  pendingCount: number;
  isSubmitting: boolean;
}

export function ImportReview({
  preview,
  decisions,
  onUpdateDecision,
  onUpdateAllDecisions,
  onBack,
  onConfirm,
  pendingCount,
  isSubmitting,
}: ImportReviewProps) {
  const { updates, conflicts } = preview.preview;
  const { withheld, errors } = preview;

  /**
   * Only the rows that carry a choice.
   *
   * A row can match a student on file and change nothing, and offering a decision
   * for it would be offering two buttons that do the same thing. Those rows are
   * listed so the operator can see they were checked, and left out of the counts.
   */
  const reviewable = updates.filter((update) => update.changes.length > 0);

  const usingIncoming = reviewable.filter(
    (update) => (decisions[update.record.row] ?? defaultDecision()) === "useIncoming"
  ).length;
  const keepingSaved = reviewable.length - usingIncoming;

  return (
    <div className="flex flex-col gap-3.5 font-sans text-ink">
      {updates.length > 0 ? (
        <>
          {/* How many rows, and the one-click answer for all of them. */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-[12px] bg-card border border-line shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-canvas text-cyan border border-line">
                <ArrowRight size={15} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink leading-none">
                  {reviewable.length === 1
                    ? "1 student has new details"
                    : `${reviewable.length} students have new details`}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Choose which details to keep for each one.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-[11px] font-semibold text-muted">Apply to all:</span>
              <div className="flex items-center p-0.5 bg-canvas rounded-[8px] border border-line text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateAllDecisions("useIncoming")}
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] font-bold transition-all cursor-pointer",
                    usingIncoming === reviewable.length
                      ? "bg-cyan text-white shadow-2xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  Use list
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateAllDecisions("keepSaved")}
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] font-bold transition-all cursor-pointer",
                    keepingSaved === reviewable.length
                      ? "bg-card text-ink shadow-2xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  Keep saved
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1">
            {updates.map((update) => {
              const row = update.record.row;
              const decision = decisions[row] ?? defaultDecision();
              const isUseIncoming = decision === "useIncoming";

              return (
                <div
                  key={row}
                  className="rounded-[12px] bg-card border border-line shadow-2xs p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs pb-1.5 border-b border-line-subtle">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-ink truncate leading-tight">
                        {update.record.name ?? update.record.displayEmail}
                      </span>
                      {update.record.studentId ? (
                        <span className="font-mono text-[11px] font-bold text-ink bg-canvas px-2 py-0.5 rounded-[5px] border border-line shrink-0">
                          {update.record.studentId}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted shrink-0">
                      {update.changes.length === 0
                        ? "Already up to date"
                        : `${update.changes.length} ${
                            update.changes.length === 1 ? "field" : "fields"
                          } differ`}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted">
                    {MATCHED_BY[update.matchedBy]}
                  </p>

                  {/*
                    A row can match a student on file and still change nothing, which
                    is a real outcome and not an empty state to design around: the
                    list simply agrees with the directory. There is nothing to choose
                    between, so no buttons are offered rather than two that would do
                    the same thing.
                  */}
                  {update.changes.length === 0 ? (
                    <p className="rounded-[9px] bg-canvas/40 px-2.5 py-2 text-[11px] text-muted">
                      Every detail on this row already matches the saved profile, so
                      there is nothing to review.
                    </p>
                  ) : (
                    <>
                      {/* Only the fields that actually change, each with both values, so
                          the operator never has to compare two near-identical cards. */}
                      <div className="space-y-1.5">
                        {update.changes.map((change) => (
                          <div
                            key={change.field}
                            className="rounded-[9px] bg-canvas/40 px-2.5 py-1.5 space-y-0.5"
                          >
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                              {FIELD_LABELS[change.field]}
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="truncate text-muted line-through">
                                {readable(change.current)}
                              </span>
                              <ArrowRight
                                size={11}
                                weight="bold"
                                className="text-muted-light shrink-0"
                              />
                              <span
                                className={cn(
                                  "truncate font-semibold",
                                  isUseIncoming ? "text-cyan" : "text-muted"
                                )}
                              >
                                {readable(change.proposed)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onUpdateDecision(row, "keepSaved")}
                          aria-pressed={!isUseIncoming}
                          className={cn(
                            "h-8 rounded-[8px] text-[11px] font-semibold gap-1.5 cursor-pointer",
                            !isUseIncoming
                              ? "border-ink/70 bg-card text-ink shadow-xs"
                              : "border-line text-muted hover:bg-canvas"
                          )}
                        >
                          {!isUseIncoming ? <CheckCircle size={13} weight="fill" /> : null}
                          <span>Keep saved</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => onUpdateDecision(row, "useIncoming")}
                          aria-pressed={isUseIncoming}
                          className={cn(
                            "h-8 rounded-[8px] text-[11px] font-semibold gap-1.5 cursor-pointer",
                            isUseIncoming
                              ? "bg-cyan text-white shadow-xs"
                              : "bg-cyan-soft/30 text-cyan hover:bg-cyan-soft/50"
                          )}
                        >
                          {isUseIncoming ? <CheckCircle size={13} weight="fill" /> : null}
                          <span>Use list</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Rows that cannot be applied at all. Said plainly, with no button that
          would imply otherwise. */}
      {conflicts.length > 0 ? (
        <div className="rounded-[12px] border border-amber-border bg-amber-soft/40 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Warning size={15} weight="bold" className="text-amber shrink-0" />
            <p className="text-xs font-bold text-ink leading-none">
              {conflicts.length === 1
                ? "1 row cannot be imported"
                : `${conflicts.length} rows cannot be imported`}
            </p>
          </div>

          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div key={conflict.record.row} className="rounded-[9px] bg-card border border-line p-2.5">
                <p className="text-[11px] text-ink leading-snug">{conflict.message}</p>
                {conflict.candidates.length > 0 ? (
                  <CandidateList candidates={conflict.candidates} />
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted leading-snug">
            These rows are left out. Fix them in the list and import again.
          </p>
        </div>
      ) : null}

      {/* Malformed and withheld rows are counted here rather than hidden, so the
          number that gets imported and the number of rows pasted can be compared. */}
      {errors.length > 0 || withheld.length > 0 ? (
        <div className="rounded-[12px] border border-line bg-canvas/50 p-3 space-y-1.5">
          <p className="text-xs font-bold text-ink leading-none">Rows left out of this import</p>
          {errors.length > 0 ? (
            <p className="text-[11px] text-muted leading-snug">
              {errors.length} {errors.length === 1 ? "row" : "rows"} could not be read at all.
            </p>
          ) : null}
          {withheld.map((entry) => (
            <p key={entry.row} className="text-[11px] text-muted leading-snug">
              {entry.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-3 border-t border-line-subtle mt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-9 px-3.5 rounded-[8px] border-line text-xs font-semibold text-ink hover:bg-canvas cursor-pointer gap-1.5 shadow-2xs"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Back</span>
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={pendingCount === 0 || isSubmitting}
          className="h-9 rounded-[8px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-2 px-5 cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <UserCheck size={16} weight="bold" />
          <span>
            {isSubmitting
              ? "Importing…"
              : pendingCount > 0
                ? `Save and Import (${pendingCount})`
                : "Nothing to import"}
          </span>
        </Button>
      </div>
    </div>
  );
}

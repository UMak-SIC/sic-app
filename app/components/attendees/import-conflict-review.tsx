"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowsLeftRight,
  CheckCircle,
  UserCheck,
} from "@phosphor-icons/react";
import { AttendeeItem } from "./attendees-table";
import { cn } from "@/lib/utils";

export interface AttendeeConflict {
  id: string; // Existing student record ID
  existing: AttendeeItem;
  incoming: Omit<
    AttendeeItem,
    | "id"
    | "assignedEvents"
    | "totalEventsJoined"
    | "attendedEventsCount"
    | "attendanceRate"
    | "joinedDate"
  >;
  differingFields: Array<"name" | "course" | "email">;
  decision: "overwrite" | "keep";
}

interface ImportConflictReviewProps {
  conflicts: AttendeeConflict[];
  onUpdateDecision: (studentId: string, decision: "overwrite" | "keep") => void;
  onUpdateAllDecisions: (decision: "overwrite" | "keep") => void;
  onBack: () => void;
  onConfirm: () => void;
  validNewCount: number;
}

export function ImportConflictReview({
  conflicts,
  onUpdateDecision,
  onUpdateAllDecisions,
  onBack,
  onConfirm,
  validNewCount,
}: ImportConflictReviewProps) {
  const overwriteCount = conflicts.filter((c) => c.decision === "overwrite").length;
  const keepCount = conflicts.filter((c) => c.decision === "keep").length;
  const totalImporting = validNewCount + overwriteCount;

  return (
    <div className="flex flex-col gap-3.5 font-sans text-ink">
      {/* Short & Clean Banner + Global Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-[12px] bg-card border border-line shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-canvas text-cyan border border-line">
            <ArrowsLeftRight size={15} weight="bold" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink leading-none">
              {conflicts.length === 1
                ? "1 conflict found"
                : `${conflicts.length} conflicts found`}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Click a card to choose which version to keep.
            </p>
          </div>
        </div>

        {/* Minimalist Segmented Pill: Apply to all */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[11px] font-semibold text-muted">Apply to all:</span>
          <div className="flex items-center p-0.5 bg-canvas rounded-[8px] border border-line text-[11px]">
            <button
              type="button"
              onClick={() => onUpdateAllDecisions("overwrite")}
              className={cn(
                "px-2.5 py-1 rounded-[6px] font-bold transition-all cursor-pointer",
                overwriteCount === conflicts.length
                  ? "bg-cyan text-white shadow-2xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Use incoming
            </button>
            <button
              type="button"
              onClick={() => onUpdateAllDecisions("keep")}
              className={cn(
                "px-2.5 py-1 rounded-[6px] font-bold transition-all cursor-pointer",
                keepCount === conflicts.length
                  ? "bg-card text-ink shadow-2xs font-bold"
                  : "text-muted hover:text-ink"
              )}
            >
              Keep saved
            </button>
          </div>
        </div>
      </div>

      {/* Selectable Conflicts Comparison Cards */}
      <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1">
        {conflicts.map((conflict, index) => {
          const { existing, incoming, differingFields, decision } = conflict;
          const isOverwrite = decision === "overwrite";
          const isKeep = decision === "keep";

          return (
            <div
              key={existing.id || index}
              className="rounded-[12px] bg-card border border-line shadow-2xs p-3.5 space-y-2.5"
            >
              {/* Record Label */}
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-line-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Record #{index + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-ink bg-canvas px-2 py-0.5 rounded-[5px] border border-line">
                    {existing.studentId}
                  </span>
                </div>
                <span className="text-[11px] text-muted">
                  {differingFields.length}{" "}
                  {differingFields.length === 1 ? "field differs" : "fields differ"}
                </span>
              </div>

              {/* Directly Clickable Selectable Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                {/* Left Card: Saved in Directory */}
                <button
                  type="button"
                  onClick={() => onUpdateDecision(existing.id, "keep")}
                  className={cn(
                    "text-left p-3 rounded-[9px] border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none relative",
                    isKeep
                      ? "bg-card border-ink/70 shadow-xs ring-1 ring-ink/20"
                      : "bg-canvas/30 border-line hover:border-ink/40 hover:bg-canvas/60 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between pb-1.5 border-b border-line-subtle mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Saved Profile
                      </span>
                      {isKeep ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-ink text-white px-2 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle size={11} weight="fill" /> Keep this
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-muted">
                          Click to keep
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-muted block">Full Name</span>
                        <p className="font-semibold text-ink leading-tight">
                          {existing.name}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <span className="text-[10px] text-muted block">Course</span>
                          <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-canvas border border-line text-ink">
                            {existing.course}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block">Email</span>
                          <p className="font-mono text-[11px] text-muted truncate">
                            {existing.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Right Card: Incoming Changes */}
                <button
                  type="button"
                  onClick={() => onUpdateDecision(existing.id, "overwrite")}
                  className={cn(
                    "text-left p-3 rounded-[9px] border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none relative",
                    isOverwrite
                      ? "bg-cyan-soft/30 border-cyan shadow-xs ring-1 ring-cyan/30"
                      : "bg-canvas/30 border-line hover:border-cyan-border hover:bg-cyan-soft/10 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between pb-1.5 border-b border-line-subtle mb-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isOverwrite ? "text-cyan font-bold" : "text-muted"
                        )}
                      >
                        Incoming Changes
                      </span>
                      {isOverwrite ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-cyan text-white px-2 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle size={11} weight="fill" /> Use this
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-cyan">
                          Click to use
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-muted block">Full Name</span>
                        <p
                          className={cn(
                            "leading-tight font-semibold",
                            differingFields.includes("name")
                              ? "text-cyan font-bold bg-cyan-soft px-1.5 py-0.5 rounded-[4px] inline-block"
                              : "text-ink"
                          )}
                        >
                          {incoming.name}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <span className="text-[10px] text-muted block">Course</span>
                          <span
                            className={cn(
                              "inline-block px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold",
                              differingFields.includes("course")
                                ? "bg-cyan text-white shadow-2xs"
                                : "bg-canvas border border-line text-ink"
                            )}
                          >
                            {incoming.course}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block">Email</span>
                          <p
                            className={cn(
                              "font-mono text-[11px] truncate",
                              differingFields.includes("email")
                                ? "text-cyan font-semibold bg-cyan-soft px-1 py-0.5 rounded-[4px]"
                                : "text-muted"
                            )}
                          >
                            {incoming.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Bottom Action Controls */}
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
          className="h-9 rounded-[8px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-2 px-5 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
        >
          <UserCheck size={16} weight="bold" />
          <span>
            Save and Import
            {totalImporting > 0 ? ` (${totalImporting})` : ""}
          </span>
        </Button>
      </div>
    </div>
  );
}

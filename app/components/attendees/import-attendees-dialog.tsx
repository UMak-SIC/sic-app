"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadSimple, FileCsv, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { AttendeeItem } from "./attendees-table";

interface ImportAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAttendees: AttendeeItem[];
  onImport: (newAttendees: Omit<AttendeeItem, "id" | "ticketCode">[]) => void;
}

export function ImportAttendeesDialog({
  open,
  onOpenChange,
  existingAttendees,
  onImport,
}: ImportAttendeesDialogProps) {
  const [pasteText, setPasteText] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Parse lines into attendees
  const parsedResults = React.useMemo(() => {
    if (!pasteText.trim()) return { valid: [], duplicates: 0, invalid: 0 };

    const lines = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const validList: Omit<AttendeeItem, "id" | "ticketCode">[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    const existingIds = new Set(existingAttendees.map((a) => a.studentId.toLowerCase()));
    const existingEmails = new Set(existingAttendees.map((a) => a.email.toLowerCase()));

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const [name, studentId, email] = parts;
        if (
          existingIds.has(studentId.toLowerCase()) ||
          existingEmails.has(email.toLowerCase())
        ) {
          duplicateCount++;
        } else {
          validList.push({
            name,
            studentId,
            email: email.toLowerCase(),
            status: "pending",
          });
        }
      } else {
        invalidCount++;
      }
    }

    return { valid: validList, duplicates: duplicateCount, invalid: invalidCount };
  }, [pasteText, existingAttendees]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPasteText(content);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (parsedResults.valid.length === 0) return;
    onImport(parsedResults.valid);
    setPasteText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-ink">
            Import Attendees
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            Upload a CSV or paste lines in format: <code className="font-mono bg-canvas px-1.5 py-0.5 rounded text-ink">Name, Student ID, Email</code>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* File upload trigger */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-cyan/60 bg-cyan-soft/40 hover:bg-cyan-soft/70 transition-colors cursor-pointer text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-2xs text-cyan mb-2">
              <UploadSimple size={20} weight="bold" />
            </div>
            <p className="text-xs font-semibold text-ink">
              Click to choose CSV file
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Supports CSV exported from Google Sheets or Excel
            </p>
          </div>

          {/* Paste area */}
          <div className="grid gap-1.5">
            <Label htmlFor="paste-area" className="text-xs font-semibold text-ink">
              Or paste roster rows
            </Label>
            <textarea
              id="paste-area"
              rows={4}
              placeholder="Andrea Santos, 2023-00182, andrea.santos@umak.edu.ph&#10;Miguel Dela Cruz, 2023-00491, miguel.delacruz@umak.edu.ph"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs text-ink placeholder:text-muted focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 resize-y"
            />
          </div>

          {/* Validation indicators */}
          {pasteText.trim() && (
            <div className="space-y-1.5 rounded-lg bg-canvas p-3 text-xs border border-line">
              <div className="flex items-center gap-1.5 text-green font-semibold">
                <CheckCircle size={15} weight="fill" />
                <span>{parsedResults.valid.length} valid attendees ready to import</span>
              </div>
              {parsedResults.duplicates > 0 && (
                <div className="flex items-center gap-1.5 text-amber font-medium">
                  <WarningCircle size={15} weight="fill" />
                  <span>{parsedResults.duplicates} duplicates skipped (already on roster)</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold border-line cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={parsedResults.valid.length === 0}
            onClick={handleApplyImport}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Import {parsedResults.valid.length > 0 ? `(${parsedResults.valid.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

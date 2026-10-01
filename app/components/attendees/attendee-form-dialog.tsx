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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, PencilSimple, Warning } from "@phosphor-icons/react";
import {
  AttendeeSaveError,
  createStudent,
  updateStudent,
  type AttendeeFieldName,
  type StudentDetails,
} from "./attendee-writes";
import type { AttendeeItem } from "./attendees-table";

/**
 * One form for adding a student and for editing one.
 *
 * Two dialogs would have meant two copies of the same six fields and two copies of
 * the same "which field is wrong" handling, and the two would drift.
 *
 * Course, program and section are free text. The registry stores whatever the
 * organizer writes, because the course KPI groups on the stored value, and the old
 * three-option list silently turned anything else into BSIT. The server reports a
 * field that is wrong by name, so the message lands on the input rather than in a
 * banner.
 */

type Fields = {
  name: string;
  studentId: string;
  email: string;
  course: string;
  program: string;
  section: string;
};

const EMPTY: Fields = { name: "", studentId: "", email: "", course: "", program: "", section: "" };

function toFields(attendee: AttendeeItem): Fields {
  return {
    name: attendee.name,
    studentId: attendee.studentId,
    email: attendee.email,
    course: attendee.course ?? "",
    program: attendee.program ?? "",
    section: attendee.section ?? "",
  };
}

interface AttendeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The student being edited. Absent means a new one is being added. */
  attendee?: AttendeeItem | null;
  /**
   * Called after a successful save with what happened, so the page can say the right
   * thing. A student who was removed and has now been added back is not the same
   * event as a new record, and the person who did it should not have to guess.
   */
  onSaved: (result: { id: string; restored: boolean }) => void;
}

export function AttendeeFormDialog({
  open,
  onOpenChange,
  attendee = null,
  onSaved,
}: AttendeeFormDialogProps) {
  const isEdit = attendee !== null;

  /**
   * Seeded once on mount. The dialog is mounted fresh each time it is opened (the
   * page renders it only while it is open), so the values below start from the
   * student being edited and no reset-on-open effect is needed. An effect here would
   * also be able to wipe what had been typed by re-running mid-edit.
   */
  const [fields, setFields] = React.useState<Fields>(() =>
    attendee ? toFields(attendee) : EMPTY
  );
  const [problem, setProblem] = React.useState<{
    field: AttendeeFieldName | null;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const set = (field: keyof Fields) => (value: string) => {
    setFields((previous) => ({ ...previous, [field]: value }));
    // Clearing the message as soon as the operator starts fixing it, rather than
    // leaving a stale complaint under a field they have already corrected.
    setProblem((previous) => (previous?.field === field ? null : previous));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSaving) return;
    if (!fields.name.trim() || !fields.studentId.trim() || !fields.email.trim()) {
      setProblem({ field: null, message: "Fill in the name, student number and email address." });
      return;
    }

    setIsSaving(true);
    setProblem(null);

    // Blank optional columns are sent as null rather than "", so an edit clears a
    // value instead of writing an empty string that reads as set-but-blank.
    const details: StudentDetails = {
      name: fields.name.trim(),
      studentId: fields.studentId.trim(),
      email: fields.email.trim(),
      course: fields.course.trim() || null,
      program: fields.program.trim() || null,
      section: fields.section.trim() || null,
    };

    try {
      if (attendee) {
        const result = await updateStudent(attendee.id, details);
        onSaved({ ...result, restored: false });
      } else {
        const result = await createStudent(details);
        onSaved(result);
      }

      onOpenChange(false);
    } catch (error) {
      setProblem({
        field: error instanceof AttendeeSaveError ? error.field : null,
        message:
          error instanceof Error
            ? error.message
            : "That student could not be saved. Check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const errorFor = (field: AttendeeFieldName) =>
    problem?.field === field ? (
      <p role="alert" className="text-[11px] text-red leading-snug">
        {problem.message}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans rounded-[12px] border-line">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-ink">
              {isEdit ? "Edit Student Profile" : "Add Student to Global Attendees"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted font-sans">
              {isEdit
                ? "Change any detail. Anything left blank is cleared."
                : "Add a new student profile to the Global Attendees directory."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="attendee-name" className="text-xs font-bold text-ink">
                Full Name
              </Label>
              <Input
                id="attendee-name"
                placeholder="e.g. Andrea Santos"
                value={fields.name}
                onChange={(event) => set("name")(event.target.value)}
                required
                aria-invalid={problem?.field === "name"}
                className="h-9 text-xs rounded-[6px] border-line"
              />
              {errorFor("name")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="attendee-id" className="text-xs font-bold text-ink">
                  Student ID
                </Label>
                <Input
                  id="attendee-id"
                  placeholder="e.g. 2023-00182"
                  value={fields.studentId}
                  onChange={(event) => set("studentId")(event.target.value)}
                  required
                  aria-invalid={problem?.field === "studentId"}
                  className="h-9 text-xs font-mono rounded-[6px] border-line"
                />
                {errorFor("studentId")}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="attendee-section" className="text-xs font-bold text-ink">
                  Section
                </Label>
                <Input
                  id="attendee-section"
                  placeholder="e.g. BSIT-2A"
                  value={fields.section}
                  onChange={(event) => set("section")(event.target.value)}
                  aria-invalid={problem?.field === "section"}
                  className="h-9 text-xs rounded-[6px] border-line"
                />
                {errorFor("section")}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="attendee-email" className="text-xs font-bold text-ink">
                University Email Address
              </Label>
              <Input
                id="attendee-email"
                type="email"
                placeholder="e.g. andrea.santos@umak.edu.ph"
                value={fields.email}
                onChange={(event) => set("email")(event.target.value)}
                required
                aria-invalid={problem?.field === "email"}
                className="h-9 text-xs rounded-[6px] border-line"
              />
              {errorFor("email")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="attendee-course" className="text-xs font-bold text-ink">
                  Course
                </Label>
                <Input
                  id="attendee-course"
                  placeholder="e.g. BSIT"
                  value={fields.course}
                  onChange={(event) => set("course")(event.target.value)}
                  aria-invalid={problem?.field === "course"}
                  className="h-9 text-xs rounded-[6px] border-line"
                />
                {errorFor("course")}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="attendee-program" className="text-xs font-bold text-ink">
                  Program
                </Label>
                <Input
                  id="attendee-program"
                  placeholder="e.g. BS Information Technology"
                  value={fields.program}
                  onChange={(event) => set("program")(event.target.value)}
                  aria-invalid={problem?.field === "program"}
                  className="h-9 text-xs rounded-[6px] border-line"
                />
                {errorFor("program")}
              </div>
            </div>

            {/* A refusal with no field of its own, such as a student number that
                belongs to somebody else. It belongs to the form as a whole. */}
            {problem && problem.field === null ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-[6px] border border-red-border bg-red-soft px-3 py-2 text-xs text-ink leading-snug"
              >
                <Warning size={14} weight="bold" className="text-red shrink-0 mt-0.5" />
                <span>{problem.message}</span>
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[6px] border-line text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              // Disabled while the request is in flight so the same student cannot be
              // added or saved twice by a second press.
              disabled={isSaving}
              className="rounded-[6px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-1.5 disabled:opacity-50"
            >
              {isEdit ? (
                <PencilSimple size={16} weight="bold" />
              ) : (
                <UserPlus size={16} weight="bold" />
              )}
              <span>
                {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Save Student Profile"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

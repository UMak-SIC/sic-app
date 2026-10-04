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
  TypeableCombobox,
  type ComboboxOption,
} from "@/components/ui/typeable-combobox";
import {
  AttendeeSaveError,
  createStudent,
  updateStudent,
  type AttendeeFieldName,
  type StudentDetails,
} from "./attendee-writes";
import type { AttendeeItem } from "./attendees-table";

export const DEFAULT_DEPARTMENT_OPTIONS: ComboboxOption[] = [
  { value: "CCIS", label: "CCIS", description: "College of Computing and Information Sciences" },
  { value: "CBFS", label: "CBFS", description: "College of Business and Financial Science" },
  { value: "CT", label: "CT", description: "College of Technology" },
  { value: "CAL", label: "CAL", description: "College of Arts and Letters" },
  { value: "COS", label: "COS", description: "College of Science" },
  { value: "CCJE", label: "CCJE", description: "College of Criminal Justice Education" },
  { value: "CSWDI", label: "CSWDI", description: "College of Social Work and Development Studies" },
  { value: "CME", label: "CME", description: "College of Maritime Education" },
  { value: "CTHM", label: "CTHM", description: "College of Tourism and Hospitality Management" },
  { value: "CGPP", label: "CGPP", description: "College of Governance and Public Policy" },
  { value: "SOL", label: "SOL", description: "School of Law" },
  { value: "IIHS", label: "IIHS", description: "Institute of Allied Health Studies" },
  { value: "CHK", label: "CHK", description: "Center for Human Kinetics" },
  { value: "HSU", label: "HSU", description: "Higher School ng UMak" },
];

export const DEFAULT_COURSE_OPTIONS: ComboboxOption[] = [
  { value: "BSIT", label: "BSIT", description: "BS in Information Technology" },
  { value: "BSCS", label: "BSCS", description: "BS in Computer Science" },
  { value: "BSCS-AppDev", label: "BSCS-AppDev", description: "BSCS Major in Application Development" },
  { value: "BSIT-NetSec", label: "BSIT-NetSec", description: "BSIT Major in Network and Security" },
  { value: "BSIT-SM", label: "BSIT-SM", description: "BSIT Major in Service Management" },
  { value: "BSIT-WebDev", label: "BSIT-WebDev", description: "BSIT Major in Web Development" },
  { value: "BSIS", label: "BSIS", description: "BS in Information Systems" },
  { value: "ACT", label: "ACT", description: "Associate in Computer Technology" },
  { value: "BSBA", label: "BSBA", description: "BS in Business Administration" },
  { value: "BSA", label: "BSA", description: "BS in Accountancy" },
  { value: "BSF", label: "BSF", description: "BS in Finance" },
  { value: "BSN", label: "BSN", description: "BS in Nursing" },
  { value: "BSP", label: "BSP", description: "BS in Pharmacy" },
  { value: "BSCrim", label: "BSCrim", description: "BS in Criminology" },
  { value: "BEEd", label: "BEEd", description: "Bachelor of Elementary Education" },
  { value: "BSEd", label: "BSEd", description: "Bachelor of Secondary Education" },
];

export const DEFAULT_SECTION_OPTIONS: ComboboxOption[] = [
  { value: "BSIT-1A", label: "BSIT-1A", description: "1st Year - Section A" },
  { value: "BSIT-1B", label: "BSIT-1B", description: "1st Year - Section B" },
  { value: "BSIT-2A", label: "BSIT-2A", description: "2nd Year - Section A" },
  { value: "BSIT-2B", label: "BSIT-2B", description: "2nd Year - Section B" },
  { value: "BSIT-3A", label: "BSIT-3A", description: "3rd Year - Section A" },
  { value: "BSIT-3B", label: "BSIT-3B", description: "3rd Year - Section B" },
  { value: "BSIT-4A", label: "BSIT-4A", description: "4th Year - Section A" },
  { value: "BSIT-4B", label: "BSIT-4B", description: "4th Year - Section B" },
  { value: "BSCS-1A", label: "BSCS-1A", description: "1st Year - Section A" },
  { value: "BSCS-1B", label: "BSCS-1B", description: "1st Year - Section B" },
  { value: "BSCS-2A", label: "BSCS-2A", description: "2nd Year - Section A" },
  { value: "BSCS-2B", label: "BSCS-2B", description: "2nd Year - Section B" },
  { value: "BSCS-3A", label: "BSCS-3A", description: "3rd Year - Section A" },
  { value: "BSCS-3B", label: "BSCS-3B", description: "3rd Year - Section B" },
  { value: "BSCS-4A", label: "BSCS-4A", description: "4th Year - Section A" },
  { value: "BSCS-4B", label: "BSCS-4B", description: "4th Year - Section B" },
  { value: "BSIS-1A", label: "BSIS-1A", description: "1st Year - Section A" },
  { value: "BSIS-2A", label: "BSIS-2A", description: "2nd Year - Section A" },
  { value: "BSIS-3A", label: "BSIS-3A", description: "3rd Year - Section A" },
  { value: "BSIS-4A", label: "BSIS-4A", description: "4th Year - Section A" },
  { value: "ACT-1A", label: "ACT-1A", description: "1st Year - Section A" },
  { value: "ACT-1B", label: "ACT-1B", description: "1st Year - Section B" },
  { value: "ACT-2A", label: "ACT-2A", description: "2nd Year - Section A" },
  { value: "ACT-2B", label: "ACT-2B", description: "2nd Year - Section B" },
  { value: "1A", label: "1A", description: "1st Year - Block A" },
  { value: "1B", label: "1B", description: "1st Year - Block B" },
  { value: "2A", label: "2A", description: "2nd Year - Block A" },
  { value: "2B", label: "2B", description: "2nd Year - Block B" },
  { value: "3A", label: "3A", description: "3rd Year - Block A" },
  { value: "3B", label: "3B", description: "3rd Year - Block B" },
  { value: "4A", label: "4A", description: "4th Year - Block A" },
  { value: "4B", label: "4B", description: "4th Year - Block B" },
];

/**
 * One form for adding a student and for editing one.
 *
 * Two dialogs would have meant two copies of the same six fields and two copies of
 * the same "which field is wrong" handling, and the two would drift.
 *
 * Course, program and section are free text with intelligent dropdown suggestions.
 * The registry stores whatever the organizer writes or selects.
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
  /** Available course options from registry facets. */
  courseOptions?: string[];
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
  courseOptions = [],
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

  // Merge default course options with any dynamic facet courses passed down
  const computedCourseOptions = React.useMemo(() => {
    const list: (string | ComboboxOption)[] = [...DEFAULT_COURSE_OPTIONS];
    for (const opt of courseOptions) {
      if (
        !list.some(
          (item) =>
            (typeof item === "string" ? item : item.value).toLowerCase() ===
            opt.toLowerCase()
        )
      ) {
        list.push({ value: opt, label: opt });
      }
    }
    return list;
  }, [courseOptions]);

  // Dynamically tailor section options based on the chosen course or department
  const computedSectionOptions = React.useMemo(() => {
    const activeTrack = (fields.program || fields.course || "").trim().toUpperCase();
    const cleanPrefix = activeTrack.split(/[\s-]+/)[0];

    if (cleanPrefix && cleanPrefix.length >= 2) {
      const tailoredSections: ComboboxOption[] = [
        { value: `${cleanPrefix}-1A`, label: `${cleanPrefix}-1A`, description: "1st Year - Section A" },
        { value: `${cleanPrefix}-1B`, label: `${cleanPrefix}-1B`, description: "1st Year - Section B" },
        { value: `${cleanPrefix}-2A`, label: `${cleanPrefix}-2A`, description: "2nd Year - Section A" },
        { value: `${cleanPrefix}-2B`, label: `${cleanPrefix}-2B`, description: "2nd Year - Section B" },
        { value: `${cleanPrefix}-3A`, label: `${cleanPrefix}-3A`, description: "3rd Year - Section A" },
        { value: `${cleanPrefix}-3B`, label: `${cleanPrefix}-3B`, description: "3rd Year - Section B" },
        { value: `${cleanPrefix}-4A`, label: `${cleanPrefix}-4A`, description: "4th Year - Section A" },
        { value: `${cleanPrefix}-4B`, label: `${cleanPrefix}-4B`, description: "4th Year - Section B" },
      ];

      const existingValues = new Set(tailoredSections.map((s) => s.value.toLowerCase()));
      const remaining = DEFAULT_SECTION_OPTIONS.filter(
        (s) => !existingValues.has(s.value.toLowerCase())
      );
      return [...tailoredSections, ...remaining];
    }

    return DEFAULT_SECTION_OPTIONS;
  }, [fields.program, fields.course]);

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
                <TypeableCombobox
                  id="attendee-section"
                  placeholder="e.g. BSIT-2A"
                  value={fields.section}
                  onChange={(val) => set("section")(val)}
                  options={computedSectionOptions}
                  aria-invalid={problem?.field === "section"}
                  inputClassName="h-9 text-xs rounded-[6px] border-line"
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
                  Department
                </Label>
                <TypeableCombobox
                  id="attendee-course"
                  placeholder="e.g. CCIS"
                  value={fields.course}
                  onChange={(val) => set("course")(val)}
                  options={DEFAULT_DEPARTMENT_OPTIONS}
                  aria-invalid={problem?.field === "course"}
                  inputClassName="h-9 text-xs rounded-[6px] border-line"
                />
                {errorFor("course")}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="attendee-program" className="text-xs font-bold text-ink">
                  Course
                </Label>
                <TypeableCombobox
                  id="attendee-program"
                  placeholder="e.g. BSCS-AppDev"
                  value={fields.program}
                  onChange={(val) => set("program")(val)}
                  options={computedCourseOptions}
                  aria-invalid={problem?.field === "program"}
                  inputClassName="h-9 text-xs rounded-[6px] border-line"
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

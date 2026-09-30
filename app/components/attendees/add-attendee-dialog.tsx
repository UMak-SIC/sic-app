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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendeeItem, CourseType } from "./attendees-table";
import { UserPlus } from "@phosphor-icons/react";

interface AddAttendeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAttendee: (attendee: Omit<AttendeeItem, "id" | "assignedEvents" | "totalEventsJoined" | "attendedEventsCount" | "attendanceRate" | "joinedDate">) => void;
}

const PROGRAM_NAMES: Record<CourseType, string> = {
  BSIT: "BS Information Technology",
  BSCS: "BS Computer Science",
  BSINS: "BS Information Systems",
};

export function AddAttendeeDialog({
  open,
  onOpenChange,
  onAddAttendee,
}: AddAttendeeDialogProps) {
  const [name, setName] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [course, setCourse] = React.useState<CourseType>("BSIT");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim() || !email.trim()) return;

    onAddAttendee({
      name: name.trim(),
      studentId: studentId.trim(),
      email: email.trim(),
      course,
      program: PROGRAM_NAMES[course],
    });

    setName("");
    setStudentId("");
    setEmail("");
    setCourse("BSIT");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans rounded-[12px] border-line">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-ink">
              Add Student to Master Directory
            </DialogTitle>
            <DialogDescription className="text-xs text-muted font-sans">
              Add a new student profile to the CCIS master directory.
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs rounded-[6px] border-line"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="attendee-id" className="text-xs font-bold text-ink">
                  Student ID
                </Label>
                <Input
                  id="attendee-id"
                  placeholder="e.g. 2023-00182"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="h-9 text-xs font-mono rounded-[6px] border-line"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="attendee-course" className="text-xs font-bold text-ink">
                  Course Track
                </Label>
                <Select value={course} onValueChange={(val) => setCourse(val as CourseType)}>
                  <SelectTrigger id="attendee-course" className="h-9 text-xs rounded-[6px] border-line">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    <SelectItem value="BSIT">BSIT (Info Tech)</SelectItem>
                    <SelectItem value="BSCS">BSCS (Comp Sci)</SelectItem>
                    <SelectItem value="BSINS">BSINS (Info Systems)</SelectItem>
                  </SelectContent>
                </Select>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-xs rounded-[6px] border-line"
              />
            </div>
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
              className="rounded-[6px] bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold gap-1.5"
            >
              <UserPlus size={16} weight="bold" />
              <span>Save Student Profile</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

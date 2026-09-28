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
import { AttendeeItem } from "./attendees-table";

interface AddAttendeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAttendee: (attendee: Omit<AttendeeItem, "id" | "ticketCode">) => void;
}

export function AddAttendeeDialog({
  open,
  onOpenChange,
  onAddAttendee,
}: AddAttendeeDialogProps) {
  const [name, setName] = React.useState("");
  const [studentId, setStudentId] = React.useState("");
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim() || !email.trim()) return;

    onAddAttendee({
      name: name.trim(),
      studentId: studentId.trim(),
      email: email.trim(),
      status: "pending",
    });

    setName("");
    setStudentId("");
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink">
              Add Attendee to Roster
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Enter participant details to register them for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="attendee-name" className="text-xs font-semibold text-ink">
                Full Name
              </Label>
              <Input
                id="attendee-name"
                placeholder="e.g. Andrea Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="attendee-id" className="text-xs font-semibold text-ink">
                Student ID
              </Label>
              <Input
                id="attendee-id"
                placeholder="e.g. 2023-00182"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="attendee-email" className="text-xs font-semibold text-ink">
                Email Address
              </Label>
              <Input
                id="attendee-email"
                type="email"
                placeholder="e.g. andrea.santos@umak.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
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
              type="submit"
              className="bg-cyan hover:bg-cyan/90 text-white text-xs font-semibold cursor-pointer"
            >
              Add Attendee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

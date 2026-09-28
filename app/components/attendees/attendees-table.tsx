"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DotsThreeVertical,
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type AttendeeStatus = "attended" | "pending" | "absent";

export interface AttendeeItem {
  id: string;
  name: string;
  studentId: string;
  email: string;
  ticketCode: string;
  status: AttendeeStatus;
  checkedInAt?: string;
}

interface AttendeesTableProps {
  attendees: AttendeeItem[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onToggleStatus: (id: string, newStatus: AttendeeStatus) => void;
  onViewTicket?: (attendee: AttendeeItem) => void;
  onRemoveAttendee?: (id: string) => void;
  className?: string;
}

const STATUS_BADGE_CONFIG: Record<
  AttendeeStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  attended: {
    label: "Attended",
    className: "bg-[#e5f2e9] text-[#176c59] border-[#b4dfc4] hover:bg-[#d8edd0]",
    icon: <CheckCircle size={12} weight="fill" className="mr-1 text-[#176c59]" />,
  },
  pending: {
    label: "Pending",
    className: "bg-[#fcf3e6] text-[#9c6016] border-[#f4dbb3] hover:bg-[#faeed6]",
    icon: <Clock size={12} weight="fill" className="mr-1 text-[#9c6016]" />,
  },
  absent: {
    label: "Absent",
    className: "bg-[#faebee] text-[#a43d49] border-[#f0c5cb] hover:bg-[#f5dde0]",
    icon: <XCircle size={12} weight="fill" className="mr-1 text-[#a43d49]" />,
  },
};

export function AttendeesTable({
  attendees,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onToggleStatus,
  onViewTicket,
  onRemoveAttendee,
  className,
}: AttendeesTableProps) {
  const allSelected =
    attendees.length > 0 && attendees.every((a) => selectedIds.includes(a.id));
  const someSelected =
    attendees.some((a) => selectedIds.includes(a.id)) && !allSelected;

  if (attendees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-line bg-card p-12 text-center shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
          <Clock size={24} weight="duotone" />
        </div>
        <h3 className="text-sm font-bold text-ink">No attendees found</h3>
        <p className="text-xs text-muted max-w-xs mt-1">
          No records match your search or status filter. Try clearing filters or importing a roster.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] border border-line bg-card shadow-xs",
        className
      )}
    >
      <Table>
        <TableHeader className="bg-canvas/50 border-b border-line">
          <TableRow className="hover:bg-transparent border-line">
            {/* Checkbox Select All */}
            {onToggleSelectAll && (
              <TableHead className="w-[44px] pl-4 pr-0">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all attendees"
                />
              </TableHead>
            )}
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider pl-4">
              Attendee
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider">
              Student ID
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider">
              Ticket Code
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider">
              Checked In
            </TableHead>
            <TableHead className="h-10 text-xs font-bold text-muted font-sans uppercase tracking-wider w-[60px] text-right pr-4">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((attendee) => {
            const badge = STATUS_BADGE_CONFIG[attendee.status];
            const isSelected = selectedIds.includes(attendee.id);

            return (
              <TableRow
                key={attendee.id}
                className={cn(
                  "border-b border-line/60 transition-colors hover:bg-canvas/30",
                  isSelected && "bg-cyan-soft/30 hover:bg-cyan-soft/40"
                )}
              >
                {/* Row Checkbox */}
                {onToggleSelect && (
                  <TableCell className="pl-4 pr-0 py-3.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(attendee.id)}
                      aria-label={`Select ${attendee.name}`}
                    />
                  </TableCell>
                )}

                {/* Name & Email */}
                <TableCell className="py-3.5 pl-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-ink font-sans">
                      {attendee.name}
                    </span>
                    <span className="text-xs text-muted font-sans">
                      {attendee.email}
                    </span>
                  </div>
                </TableCell>

                {/* Student ID */}
                <TableCell className="py-3.5 font-mono text-xs text-ink font-medium">
                  {attendee.studentId}
                </TableCell>

                {/* Ticket Code */}
                <TableCell className="py-3.5 font-mono text-xs text-muted">
                  {attendee.ticketCode}
                </TableCell>

                {/* Status Badge */}
                <TableCell className="py-3.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-none",
                      badge.className
                    )}
                  >
                    {badge.icon}
                    {badge.label}
                  </Badge>
                </TableCell>

                {/* Check-in time */}
                <TableCell className="py-3.5 text-xs text-ink font-sans">
                  {attendee.checkedInAt ? (
                    <span className="font-medium text-[#176c59]">
                      {attendee.checkedInAt}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TableCell>

                {/* Dropdown Action Menu */}
                <TableCell className="py-3.5 text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                      >
                        <DotsThreeVertical size={18} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-sans">
                      {onViewTicket && (
                        <DropdownMenuItem
                          onClick={() => onViewTicket(attendee)}
                          className="cursor-pointer text-xs"
                        >
                          <QrCode size={16} className="mr-2 text-cyan" />
                          View Ticket
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          onToggleStatus(
                            attendee.id,
                            attendee.status === "attended"
                              ? "pending"
                              : "attended"
                          )
                        }
                        className="cursor-pointer text-xs"
                      >
                        <CheckCircle size={16} className="mr-2 text-[#176c59]" />
                        {attendee.status === "attended"
                          ? "Mark as Pending"
                          : "Mark as Attended"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onToggleStatus(attendee.id, "absent")}
                        className="cursor-pointer text-xs text-red"
                      >
                        <XCircle size={16} className="mr-2 text-red" />
                        Mark as Absent
                      </DropdownMenuItem>
                      {onRemoveAttendee && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onRemoveAttendee(attendee.id)}
                            className="cursor-pointer text-xs text-red hover:bg-red-50"
                          >
                            <Trash size={16} className="mr-2" />
                            Remove from roster
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

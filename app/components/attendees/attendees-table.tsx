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
import { ProfileCircle } from "./profile-circle";
import { AvatarStack, EventBadgeItem } from "./avatar-stack";
import { RosterCombMeter } from "./roster-comb-meter";
import {
  DotsThreeVertical,
  DotsSixVertical,
  Eye,
  CalendarPlus,
  PencilSimple,
  Trash,
  Users,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CourseType = "BSIT" | "BSCS" | "BSINS";

export interface AttendeeItem {
  id: string;
  name: string;
  studentId: string;
  email: string;
  course: CourseType;
  program: string;
  assignedEvents: EventBadgeItem[];
  totalEventsJoined: number;
  attendedEventsCount: number;
  attendanceRate: number;
  joinedDate: string;
}

interface AttendeesTableProps {
  attendees: AttendeeItem[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onReorder?: (attendees: AttendeeItem[]) => void;
  onViewProfile?: (attendee: AttendeeItem) => void;
  onAddToEvent?: (attendee: AttendeeItem) => void;
  onEditAttendee?: (attendee: AttendeeItem) => void;
  onRemoveAttendee?: (id: string) => void;
  className?: string;
}

// Course badge styling strictly locked to BSIT, BSCS, and BSINS using DESIGN.md tokens with subtle gradient backgrounds
const COURSE_BADGES: Record<CourseType, { bg: string; text: string; border: string; title: string }> = {
  BSIT: {
    bg: "bg-linear-to-r from-cyan-soft via-cyan-soft/80 to-cyan-soft/40",
    text: "text-cyan",
    border: "border-cyan-border",
    title: "Information Technology",
  },
  BSCS: {
    bg: "bg-linear-to-r from-green-soft via-green-soft/80 to-green-soft/40",
    text: "text-green",
    border: "border-green-border",
    title: "Computer Science",
  },
  BSINS: {
    bg: "bg-linear-to-r from-amber-soft via-amber-soft/80 to-amber-soft/40",
    text: "text-amber",
    border: "border-amber-border",
    title: "Information Systems",
  },
};

export function AttendeesTable({
  attendees,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onReorder,
  onViewProfile,
  onAddToEvent,
  onEditAttendee,
  onRemoveAttendee,
  className,
}: AttendeesTableProps) {
  const [items, setItems] = React.useState<AttendeeItem[]>(attendees);

  React.useEffect(() => {
    setItems(attendees);
  }, [attendees]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"top" | "bottom" | null>(null);

  const isAllSelected =
    items.length > 0 && selectedIds.length === items.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  const handleReorder = (newItems: AttendeeItem[]) => {
    setItems(newItems);
    onReorder?.(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index - 1, 0, moved);
    handleReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index + 1, 0, moved);
    handleReorder(newItems);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLTableRowElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLTableRowElement>,
    index: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const targetRow = e.currentTarget;
    const rect = targetRow.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    setDragOverIndex(index);
    setDropPosition(relativeY < rect.height / 2 ? "top" : "bottom");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLTableRowElement>,
    targetIndex: number
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex && dropPosition === "top") {
      insertIndex = targetIndex - 1;
    } else if (draggedIndex > targetIndex && dropPosition === "bottom") {
      insertIndex = targetIndex + 1;
    }

    newItems.splice(insertIndex, 0, draggedItem);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    handleReorder(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-line bg-card py-16 px-4 text-center shadow-2xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
          <Users size={24} weight="bold" />
        </div>
        <h3 className="font-display text-base font-bold text-ink">
          No students found
        </h3>
        <p className="mt-1 font-sans text-xs text-muted max-w-sm">
          No student records match your search or filter criteria. Try clearing search or importing a new list.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Top subtle multi-tone course gradient highlight bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-cyan via-green to-amber opacity-50 z-10" />

      <div className="overflow-x-auto w-full">
        <Table className="min-w-[760px] table-fixed">
          <TableHeader>
          <TableRow className="bg-linear-to-b from-canvas/90 via-canvas/60 to-canvas/20 hover:bg-canvas/70 border-b border-line">
            {/* Selection & Reorder Checkbox */}
            <TableHead className="w-14 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="w-6" aria-hidden="true" />
                {onToggleSelectAll && (
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all students"
                  />
                )}
              </div>
            </TableHead>

            {/* Student Name & ID */}
            <TableHead className="w-[30%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Student
            </TableHead>

            {/* Course / Program Track */}
            <TableHead className="w-[20%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Course & Program
            </TableHead>

            {/* Registered Events */}
            <TableHead className="w-[22%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Registered Events
            </TableHead>

            {/* Attendance Record (Tick Comb) */}
            <TableHead className="w-[18%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Attendance Record
            </TableHead>

            {/* Row Actions */}
            <TableHead className="w-[10%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((student, index) => {
            const isSelected = selectedIds.includes(student.id);
            const isBeingDragged = draggedIndex === index;
            const isOverTarget = dragOverIndex === index;
            const badgeStyle = COURSE_BADGES[student.course] || COURSE_BADGES.BSIT;

            return (
              <TableRow
                key={student.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "group transition-all duration-150 border-b border-line/60",
                  isSelected && "bg-linear-to-r from-cyan-soft/50 via-cyan-soft/20 to-transparent hover:from-cyan-soft/60 hover:via-cyan-soft/30 hover:to-transparent",
                  !isSelected && "hover:bg-linear-to-r hover:from-canvas/70 hover:via-canvas/30 hover:to-transparent",
                  isBeingDragged &&
                    "opacity-40 bg-cyan-soft/20 scale-[0.99] shadow-sm",
                  isOverTarget &&
                    dropPosition === "top" &&
                    "border-t-2 border-t-cyan",
                  isOverTarget &&
                    dropPosition === "bottom" &&
                    "border-b-2 border-b-cyan"
                )}
              >
                {/* Drag Grip + Selection Checkbox */}
                <TableCell className="pl-3 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      tabIndex={0}
                      className="flex items-center justify-center size-6 rounded-[4px] text-muted-light hover:text-ink hover:bg-canvas cursor-grab active:cursor-grabbing transition-colors"
                      title="Drag to reorder student row"
                      aria-label={`Drag to reorder ${student.name}`}
                    >
                      <DotsSixVertical size={16} weight="bold" />
                    </button>
                    {onToggleSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    )}
                  </div>
                </TableCell>

                {/* Profile Circle + Name & Email */}
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3 max-w-[95%]">
                    <ProfileCircle name={student.name} size="md" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans text-sm font-bold text-ink group-hover:text-cyan transition-colors truncate">
                        {student.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                        <span className="font-mono text-muted-light font-medium shrink-0">
                          {student.studentId}
                        </span>
                        <span className="text-muted-light shrink-0">·</span>
                        <span className="truncate">{student.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Course Track (BSIT / BSCS / BSINS) */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-1 max-w-[95%]">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-none",
                          badgeStyle.bg,
                          badgeStyle.text,
                          badgeStyle.border
                        )}
                      >
                        {student.course}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted font-sans truncate" title={student.program}>
                      {student.program}
                    </span>
                  </div>
                </TableCell>

                {/* Registered Events Avatar Stack */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-1">
                    <AvatarStack events={student.assignedEvents} max={3} />
                    <span className="text-[11px] text-muted font-medium font-sans">
                      {student.totalEventsJoined === 0
                        ? "Not in any event"
                        : student.totalEventsJoined === 1
                        ? "1 registered event"
                        : `${student.totalEventsJoined} registered events`}
                    </span>
                  </div>
                </TableCell>

                {/* Attendance Record (HoldingsTable-inspired Tick Comb) */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-1">
                    <RosterCombMeter
                      rate={student.attendanceRate}
                      totalEvents={student.totalEventsJoined}
                      attendedEvents={student.attendedEventsCount}
                    />
                    <span className="text-[10px] text-muted-light font-sans">
                      {student.totalEventsJoined === 0
                        ? "No event history"
                        : `${student.attendedEventsCount} of ${student.totalEventsJoined} attended`}
                    </span>
                  </div>
                </TableCell>

                {/* Row Action Dropdown */}
                <TableCell className="text-right pr-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {onAddToEvent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddToEvent(student)}
                        className="h-8 gap-1 rounded-full border-line px-2.5 text-xs font-sans font-semibold text-ink hover:bg-cyan-soft hover:text-cyan hover:border-cyan-border cursor-pointer shadow-2xs"
                        title="Add to event"
                      >
                        <CalendarPlus size={14} weight="bold" />
                        <span className="hidden sm:inline">Add to Event</span>
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                          aria-label="Student options"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 font-sans">
                        <DropdownMenuItem
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-xs"
                        >
                          <ArrowUp size={15} className="mr-2 text-muted" />
                          Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveDown(index)}
                          disabled={index === items.length - 1}
                          className="text-xs"
                        >
                          <ArrowDown size={15} className="mr-2 text-muted" />
                          Move Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {onViewProfile && (
                          <DropdownMenuItem
                            onClick={() => onViewProfile(student)}
                            className="text-xs cursor-pointer"
                          >
                            <Eye size={15} className="mr-2 text-muted" />
                            View Profile
                          </DropdownMenuItem>
                        )}
                        {onAddToEvent && (
                          <DropdownMenuItem
                            onClick={() => onAddToEvent(student)}
                            className="text-xs cursor-pointer"
                          >
                            <CalendarPlus size={15} className="mr-2 text-cyan" />
                            Add to Event
                          </DropdownMenuItem>
                        )}
                        {onEditAttendee && (
                          <DropdownMenuItem
                            onClick={() => onEditAttendee(student)}
                            className="text-xs cursor-pointer"
                          >
                            <PencilSimple size={15} className="mr-2 text-muted" />
                            Edit Details
                          </DropdownMenuItem>
                        )}
                        {onRemoveAttendee && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRemoveAttendee(student.id)}
                              className="text-xs text-red focus:text-red focus:bg-red-soft cursor-pointer"
                            >
                              <Trash size={15} className="mr-2" />
                              Remove Student
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

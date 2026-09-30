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
import { ProfileCircle } from "@/components/attendees/profile-circle";
import {
  MagnifyingGlass,
  DownloadSimple,
  CheckCircle,
  Clock,
  XCircle,
  X,
  DotsThreeVertical,
  EnvelopeSimple,
  QrCode,
  Funnel,
  Users,
  Check,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type EventAttendeeStatus = "attended" | "pending" | "absent";
export type EventCollege = "CCIS" | "CBFS" | "CT" | "CAL" | "Other";
export type EventCourse = "BSIT" | "BSCS" | "BSINS" | "BSBA" | "BSOA" | "BET" | "ABComm";

export interface EventRosterAttendee {
  id: string;
  name: string;
  studentId: string;
  email: string;
  college: EventCollege;
  course: EventCourse;
  program: string;
  status: EventAttendeeStatus;
  checkedInAt?: string;
}

const INITIAL_ROSTER_DATA: EventRosterAttendee[] = [
  {
    id: "att_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    college: "CCIS",
    course: "BSIT",
    program: "BS Information Technology",
    status: "attended",
    checkedInAt: "2:14 PM",
  },
  {
    id: "att_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    college: "CCIS",
    course: "BSCS",
    program: "BS Computer Science",
    status: "attended",
    checkedInAt: "2:18 PM",
  },
  {
    id: "att_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    college: "CCIS",
    course: "BSINS",
    program: "BS Information Systems",
    status: "pending",
  },
  {
    id: "att_4",
    name: "Joshua Lim",
    studentId: "2023-00823",
    email: "joshua.lim@umak.edu.ph",
    college: "CCIS",
    course: "BSIT",
    program: "BS Information Technology",
    status: "attended",
    checkedInAt: "2:25 PM",
  },
  {
    id: "att_5",
    name: "Patricia Reyes",
    studentId: "2023-00911",
    email: "patricia.reyes@umak.edu.ph",
    college: "CCIS",
    course: "BSCS",
    program: "BS Computer Science",
    status: "pending",
  },
  {
    id: "att_6",
    name: "Christian Bautista",
    studentId: "2023-01044",
    email: "christian.bautista@umak.edu.ph",
    college: "CBFS",
    course: "BSBA",
    program: "BS Business Administration",
    status: "attended",
    checkedInAt: "2:05 PM",
  },
  {
    id: "att_7",
    name: "Erika Mae Tan",
    studentId: "2023-01289",
    email: "erika.tan@umak.edu.ph",
    college: "CBFS",
    course: "BSOA",
    program: "BS Office Administration",
    status: "pending",
  },
  {
    id: "att_8",
    name: "Rafael Mercado",
    studentId: "2023-01550",
    email: "rafael.mercado@umak.edu.ph",
    college: "CT",
    course: "BET",
    program: "Bachelor of Engineering Technology",
    status: "attended",
    checkedInAt: "1:58 PM",
  },
  {
    id: "att_9",
    name: "Janelle Garcia",
    studentId: "2023-01822",
    email: "janelle.garcia@umak.edu.ph",
    college: "CAL",
    course: "ABComm",
    program: "AB Broadcasting & Communication",
    status: "absent",
  },
];

const COURSE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  BSIT: { bg: "bg-cyan-soft/60", text: "text-cyan", border: "border-cyan-border/80" },
  BSCS: { bg: "bg-green-soft/60", text: "text-green", border: "border-green-border/80" },
  BSINS: { bg: "bg-amber-soft/60", text: "text-amber", border: "border-amber-border/80" },
  BSBA: { bg: "bg-cyan-soft/40", text: "text-ink", border: "border-line" },
  BSOA: { bg: "bg-canvas", text: "text-muted", border: "border-line" },
  BET: { bg: "bg-amber-soft/40", text: "text-amber", border: "border-amber-border/60" },
  ABComm: { bg: "bg-cyan-soft/30", text: "text-ink", border: "border-line" },
};

interface EventRosterProps {
  selectedCollegeFilter?: string | null;
  onClearCollegeFilter?: () => void;
  onExport?: () => void;
  className?: string;
}

export function EventRoster({
  selectedCollegeFilter = null,
  onClearCollegeFilter,
  onExport,
  className,
}: EventRosterProps) {
  const [roster, setRoster] = React.useState<EventRosterAttendee[]>(INITIAL_ROSTER_DATA);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | EventAttendeeStatus>("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // 1-Click Mark Attended Action
  const handleMarkAttended = (attendeeId: string) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setRoster((prev) =>
      prev.map((att) =>
        att.id === attendeeId
          ? { ...att, status: "attended", checkedInAt: formattedTime }
          : att
      )
    );
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredItems: EventRosterAttendee[]) => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  // Batch Mark Attended
  const handleBatchMarkAttended = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setRoster((prev) =>
      prev.map((att) =>
        selectedIds.includes(att.id)
          ? { ...att, status: "attended", checkedInAt: formattedTime }
          : att
      )
    );
    setSelectedIds([]);
  };

  // Filter items
  const filteredAttendees = roster.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.studentId.includes(search) ||
      item.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    const matchesCollege =
      !selectedCollegeFilter ||
      item.college === selectedCollegeFilter ||
      (selectedCollegeFilter === "Other" && !["CCIS", "CBFS", "CT", "CAL"].includes(item.college));

    return matchesSearch && matchesStatus && matchesCollege;
  });

  const attendedCount = roster.filter((r) => r.status === "attended").length;
  const pendingCount = roster.filter((r) => r.status === "pending").length;
  const absentCount = roster.filter((r) => r.status === "absent").length;

  const isAllSelected =
    filteredAttendees.length > 0 && selectedIds.length === filteredAttendees.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredAttendees.length;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3.5 border-b border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-bold text-ink">
            Event attendee roster
          </h2>
          <span className="rounded-full bg-canvas px-2.5 py-0.5 font-sans text-xs font-semibold text-muted">
            {filteredAttendees.length} students
          </span>

          {selectedCollegeFilter && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-soft px-3 py-0.5 font-sans text-xs font-semibold text-cyan border border-cyan-border">
              <Funnel size={13} weight="bold" />
              <span>{selectedCollegeFilter}</span>
              <button
                type="button"
                onClick={onClearCollegeFilter}
                className="hover:text-ink cursor-pointer ml-0.5"
                title="Clear college filter"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          )}
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              aria-label="Search attendees"
              placeholder="Search name, student ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-line bg-card pl-8.5 pr-8 font-sans text-xs text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 shrink-0 gap-1.5 rounded-full border-line px-3.5 font-sans text-xs font-semibold text-ink hover:bg-canvas cursor-pointer active:translate-y-px"
          >
            <DownloadSimple size={15} weight="bold" />
            <span className="hidden sm:inline">Export list</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Batch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle px-4 py-2 bg-canvas/30">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
              statusFilter === "all"
                ? "bg-ink text-paper"
                : "text-muted hover:text-ink hover:bg-canvas"
            )}
          >
            All ({roster.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("attended")}
            className={cn(
              "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
              statusFilter === "attended"
                ? "bg-green text-white"
                : "text-muted hover:text-green hover:bg-green-soft"
            )}
          >
            Attended ({attendedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
              statusFilter === "pending"
                ? "bg-amber text-white"
                : "text-muted hover:text-amber hover:bg-amber-soft"
            )}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("absent")}
            className={cn(
              "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
              statusFilter === "absent"
                ? "bg-red text-white"
                : "text-muted hover:text-red hover:bg-red-soft"
            )}
          >
            Absent ({absentCount})
          </button>
        </div>

        {/* Batch Action Bar if selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs font-medium text-ink">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              onClick={handleBatchMarkAttended}
              className="h-7 rounded-full bg-green hover:bg-green-hover text-white font-sans text-xs font-semibold px-3 cursor-pointer"
            >
              <Check size={13} weight="bold" className="mr-1" />
              Mark attended
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 rounded-full border-line text-xs font-sans text-muted hover:text-ink px-2.5 cursor-pointer"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table Content */}
      {filteredAttendees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
            <Users size={24} weight="bold" />
          </div>
          <h3 className="font-display text-sm font-bold text-ink">
            No attendees found
          </h3>
          <p className="mt-1 font-sans text-xs text-muted max-w-sm">
            No student records match your active search or filters.
          </p>
          {(search || statusFilter !== "all" || selectedCollegeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                onClearCollegeFilter?.();
              }}
              className="mt-3 font-sans text-xs font-semibold text-cyan underline-offset-4 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[700px] table-fixed">
            <TableHeader>
              <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
                <TableHead className="w-12 pl-4">
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={() => handleToggleSelectAll(filteredAttendees)}
                    aria-label="Select all students in view"
                  />
                </TableHead>
                <TableHead className="w-[34%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  Student & Account
                </TableHead>
                <TableHead className="w-[18%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  College & Course
                </TableHead>
                <TableHead className="w-[16%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  Attendance Status
                </TableHead>
                <TableHead className="w-[16%] font-sans font-bold text-xs uppercase tracking-wider text-muted hidden md:table-cell">
                  Attended Time
                </TableHead>
                <TableHead className="w-[16%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
                  Quick Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAttendees.map((student) => {
                const isSelected = selectedIds.includes(student.id);
                const badgeStyle = COURSE_BADGES[student.course] || COURSE_BADGES.BSIT;

                return (
                  <TableRow
                    key={student.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "group transition-colors border-b border-line/60 hover:bg-canvas/40",
                      isSelected && "bg-cyan-soft/30 hover:bg-cyan-soft/40"
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell className="pl-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>

                    {/* Profile Circle + Name, Student ID & Email */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3 min-w-0">
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

                    {/* Course & College Track */}
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
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
                          <span className="text-[11px] font-semibold text-muted font-sans">
                            {student.college}
                          </span>
                        </div>
                        <span className="text-xs text-muted font-sans truncate" title={student.program}>
                          {student.program}
                        </span>
                      </div>
                    </TableCell>

                    {/* Attendance Status */}
                    <TableCell className="py-3">
                      {student.status === "attended" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-green">
                          <CheckCircle size={13} weight="bold" />
                          Attended
                        </span>
                      ) : student.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-amber">
                          <Clock size={13} weight="bold" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-border bg-red-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-red">
                          <XCircle size={13} weight="bold" />
                          Absent
                        </span>
                      )}
                    </TableCell>

                    {/* Attended Time */}
                    <TableCell className="py-3 hidden md:table-cell font-sans text-xs text-ink font-medium">
                      {student.checkedInAt ?? <span className="text-muted-light">-</span>}
                    </TableCell>

                    {/* Quick Action Button & Options Dropdown */}
                    <TableCell className="py-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {student.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAttended(student.id)}
                            className="h-7 rounded-full bg-cyan px-3 font-sans text-xs font-semibold text-white shadow-2xs hover:bg-cyan-hover cursor-pointer active:translate-y-px"
                          >
                            <Check size={13} weight="bold" className="mr-1" />
                            Mark attended
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            className="h-7 px-2 font-sans text-xs text-muted font-medium"
                          >
                            Attended
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                              aria-label="Student options"
                            >
                              <DotsThreeVertical size={16} weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 font-sans text-xs">
                            <DropdownMenuItem className="cursor-pointer">
                              <QrCode size={14} className="mr-2 text-cyan" />
                              View digital pass
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <EnvelopeSimple size={14} className="mr-2 text-muted" />
                              Resend email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red focus:text-red focus:bg-red-soft">
                              Mark as absent
                            </DropdownMenuItem>
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
      )}
    </div>
  );
}

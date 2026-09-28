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
import { Button } from "@/components/ui/button";
import {
  DownloadSimple,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface AttendeeRosterItem {
  id: string;
  name: string;
  studentId: string;
  email: string;
  program: string;
  status: "attended" | "pending" | "absent";
  checkedInAt?: string;
}

const SAMPLE_ROSTER: AttendeeRosterItem[] = [
  {
    id: "att_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    program: "BS Information Technology",
    status: "attended",
    checkedInAt: "2:14 PM",
  },
  {
    id: "att_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    program: "BS Computer Science",
    status: "attended",
    checkedInAt: "2:18 PM",
  },
  {
    id: "att_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    program: "BS Information Systems",
    status: "pending",
  },
  {
    id: "att_4",
    name: "Joshua Lim",
    studentId: "2023-00823",
    email: "joshua.lim@umak.edu.ph",
    program: "BS Information Technology",
    status: "attended",
    checkedInAt: "2:25 PM",
  },
  {
    id: "att_5",
    name: "Patricia Reyes",
    studentId: "2023-00911",
    email: "patricia.reyes@umak.edu.ph",
    program: "BS Computer Science",
    status: "pending",
  },
];

interface EventRosterProps {
  onExport?: () => void;
  className?: string;
}

export function EventRoster({ onExport, className }: EventRosterProps) {
  const [search, setSearch] = React.useState("");

  const filtered = SAMPLE_ROSTER.filter(
    (item) =>
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.studentId.includes(search) ||
      item.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] border border-line bg-card shadow-2xs",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-line-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-sm font-bold text-ink">Roster</h2>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              aria-label="Search attendees"
              placeholder="Search name, ID, or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-[8px] border border-line bg-card pl-8.5 pr-8 font-sans text-xs text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X size={15} weight="bold" />
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
            <span>Export</span>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <MagnifyingGlass size={22} weight="bold" className="text-muted-light" />
          <p className="font-display text-sm font-semibold text-ink">
            No attendees match
          </p>
          <p className="font-sans text-xs text-muted">
            Try a different name, student ID, or email.
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-1 font-sans text-xs font-semibold text-cyan underline-offset-4 hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-canvas/40 hover:bg-canvas/40">
              <TableHead className="pl-4 font-sans font-semibold text-xs uppercase tracking-wider text-muted">
                Student / Attendee
              </TableHead>
              <TableHead className="hidden font-sans font-semibold text-xs uppercase tracking-wider text-muted sm:table-cell">
                Student ID
              </TableHead>
              <TableHead className="hidden font-sans font-semibold text-xs uppercase tracking-wider text-muted lg:table-cell">
                Program
              </TableHead>
              <TableHead className="font-sans font-semibold text-xs uppercase tracking-wider text-muted">
                Attendance
              </TableHead>
              <TableHead className="hidden pr-4 text-right font-sans font-semibold text-xs uppercase tracking-wider text-muted md:table-cell">
                Check-in Time
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="hover:bg-canvas/30">
                <TableCell className="py-3 pl-4">
                  <div className="flex flex-col">
                    <span className="font-display text-sm font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="font-sans text-xs text-muted">
                      {item.email}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="hidden py-3 font-sans text-xs font-medium tabular-nums text-muted sm:table-cell">
                  {item.studentId}
                </TableCell>

                <TableCell className="hidden py-3 font-sans text-xs text-ink lg:table-cell">
                  {item.program}
                </TableCell>

                <TableCell className="py-3">
                  {item.status === "attended" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-green">
                      <CheckCircle size={13} weight="bold" />
                      Attended
                    </span>
                  ) : item.status === "pending" ? (
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

                <TableCell className="hidden py-3 pr-4 text-right font-sans text-xs font-medium text-ink md:table-cell">
                  {item.checkedInAt ?? (
                    <span className="text-muted-light">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

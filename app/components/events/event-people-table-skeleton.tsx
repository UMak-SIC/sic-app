import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EventPeopleTableSkeletonProps {
  rowCount?: number;
}

export function EventPeopleTableSkeleton({
  rowCount = 5,
}: EventPeopleTableSkeletonProps) {
  return (
    <div className="overflow-x-auto w-full" aria-busy="true" aria-label="Loading invited people">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
            <TableHead className="pl-5 text-xs font-bold text-muted w-[35%]">
              Person
            </TableHead>
            <TableHead className="text-xs font-bold text-muted w-[25%]">
              Student ID
            </TableHead>
            <TableHead className="text-xs font-bold text-muted w-[20%]">
              Ticket
            </TableHead>
            <TableHead className="pr-5 text-xs font-bold text-muted w-[20%]">
              Attendance
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, index) => (
            <TableRow
              key={index}
              className="border-line-subtle hover:bg-transparent"
            >
              {/* Person column: avatar + name & email */}
              <TableCell className="py-3 pl-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Skeleton className="h-4 w-32 rounded-[4px]" />
                    <Skeleton className="h-3 w-44 rounded-[4px]" />
                  </div>
                </div>
              </TableCell>

              {/* Student ID column */}
              <TableCell className="py-3">
                <Skeleton className="h-4 w-28 rounded-[4px]" />
              </TableCell>

              {/* Ticket status pill */}
              <TableCell className="py-3">
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>

              {/* Attendance status pill */}
              <TableCell className="py-3 pr-5">
                <Skeleton className="h-5 w-24 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

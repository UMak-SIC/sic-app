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

interface EventsTableSkeletonProps {
  rowCount?: number;
}

export function EventsTableSkeleton({ rowCount = 6 }: EventsTableSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-3.5 w-full"
      aria-busy="true"
      aria-label="Loading events catalog"
    >
      {/* Toolbar Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search bar placeholder */}
          <Skeleton className="h-9 w-full sm:w-72 rounded-[6px]" />

          {/* Status filter button placeholders */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 w-16 rounded-[6px]" />
            <Skeleton className="h-9 w-22 rounded-[6px]" />
            <Skeleton className="h-9 w-18 rounded-[6px]" />
            <Skeleton className="h-9 w-18 rounded-[6px]" />
          </div>
        </div>

        {/* Export / Selection Action Skeleton */}
        <Skeleton className="h-9 w-28 rounded-[6px] shrink-0" />
      </div>

      {/* Table Container Skeleton */}
      <div className="relative rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="table-fixed min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
                <TableHead className="w-14 pl-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6" aria-hidden="true" />
                    <Skeleton className="size-4 rounded-[4px]" />
                  </div>
                </TableHead>
                <TableHead className="w-[28%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  Event
                </TableHead>
                <TableHead className="w-[22%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  People
                </TableHead>
                <TableHead className="w-[20%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  Date & Time
                </TableHead>
                <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                  Status
                </TableHead>
                <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Array.from({ length: rowCount }).map((_, index) => (
                <TableRow
                  key={index}
                  className="border-l-[4px] border-l-line/40 border-b border-line/60 hover:bg-transparent"
                >
                  {/* Drag Handle & Checkbox */}
                  <TableCell className="pl-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-6 rounded-[4px]" />
                      <Skeleton className="size-4 rounded-[4px]" />
                    </div>
                  </TableCell>

                  {/* Title & Venue */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col gap-1.5 max-w-[95%]">
                      <Skeleton className="h-4.5 w-48 rounded-[4px]" />
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="size-3.5 rounded-full shrink-0" />
                        <Skeleton className="h-3.5 w-28 rounded-[4px]" />
                      </div>
                    </div>
                  </TableCell>

                  {/* People Count & Meter */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col gap-1.5 pr-4">
                      <Skeleton className="h-4 w-16 rounded-[4px]" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2 w-24 rounded-full" />
                        <Skeleton className="h-3 w-8 rounded-[4px]" />
                      </div>
                    </div>
                  </TableCell>

                  {/* Date & Time */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-28 rounded-[4px]" />
                      <Skeleton className="h-3.5 w-32 rounded-[4px]" />
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="py-3.5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>

                  {/* Row Actions */}
                  <TableCell className="text-right pr-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Skeleton className="h-8 w-16 rounded-[6px]" />
                      <Skeleton className="size-8 rounded-[6px]" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1">
        <Skeleton className="h-4 w-40 rounded-[4px]" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-[6px]" />
          <Skeleton className="h-8 w-8 rounded-[6px]" />
          <Skeleton className="h-8 w-8 rounded-[6px]" />
          <Skeleton className="h-8 w-8 rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}

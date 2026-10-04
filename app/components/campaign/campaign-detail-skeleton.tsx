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

export function CampaignDetailSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div
      className="flex flex-col gap-6 w-full pb-14 font-sans"
      aria-busy="true"
      aria-label="Loading campaign delivery details"
    >
      {/* Header Banner Skeleton */}
      <section className="flex flex-col gap-4 rounded-[16px] border border-line bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-32 rounded-[6px]" />
          <Skeleton className="h-9 w-36 rounded-[6px]" />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-8 sm:h-9 w-2/3 max-w-lg rounded-[6px]" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Skeleton className="h-4 w-40 rounded-[4px]" />
            <Skeleton className="h-4 w-48 rounded-[4px]" />
          </div>
        </div>
      </section>

      {/* 4 KPI Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-[16px] bg-card border border-line p-4 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-4.5 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-[4px]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <Skeleton className="h-8 w-16 rounded-[6px]" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Table Section Skeleton */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Skeleton className="h-9 w-full sm:w-80 rounded-[6px]" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        {/* Table */}
        <div className="relative rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <Table className="table-fixed min-w-[740px]">
              <TableHeader>
                <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
                  <TableHead className="w-14 pl-3">
                    <Skeleton className="size-4 rounded-[4px]" />
                  </TableHead>
                  <TableHead className="w-[24%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Student Recipient
                  </TableHead>
                  <TableHead className="w-[12%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Course
                  </TableHead>
                  <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Provider
                  </TableHead>
                  <TableHead className="w-[15%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Date & Time
                  </TableHead>
                  <TableHead className="w-[13%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Status
                  </TableHead>
                  <TableHead className="w-[10%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                    Ticket Pass
                  </TableHead>
                  <TableHead className="w-[12%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
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
                    {/* Grip & Checkbox */}
                    <TableCell className="pl-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-5 rounded-[4px]" />
                        <Skeleton className="size-4 rounded-[4px]" />
                      </div>
                    </TableCell>

                    {/* Student Recipient */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="flex flex-col gap-1 min-w-0">
                          <Skeleton className="h-4 w-32 rounded-[4px]" />
                          <Skeleton className="h-3 w-40 rounded-[4px]" />
                        </div>
                      </div>
                    </TableCell>

                    {/* Course */}
                    <TableCell className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-3 w-20 rounded-[4px]" />
                      </div>
                    </TableCell>

                    {/* Provider */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-6 rounded-[5px] shrink-0" />
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-3.5 w-14 rounded-[4px]" />
                          <Skeleton className="h-2.5 w-18 rounded-[4px]" />
                        </div>
                      </div>
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell className="py-3.5">
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-3.5 w-20 rounded-[4px]" />
                        <Skeleton className="h-3 w-14 rounded-[4px]" />
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5">
                      <Skeleton className="h-5 w-22 rounded-full" />
                    </TableCell>

                    {/* Ticket Pass */}
                    <TableCell className="py-3.5">
                      <Skeleton className="h-5 w-20 rounded-[4px]" />
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right pr-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton className="h-8 w-20 rounded-full" />
                        <Skeleton className="size-8 rounded-[6px]" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

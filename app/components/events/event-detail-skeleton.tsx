import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventPeopleTableSkeleton } from "./event-people-table-skeleton";

export function EventDetailSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-6 pt-6 pb-16 font-sans"
      aria-busy="true"
      aria-label="Loading event details"
    >
      {/* Hero Banner Section Skeleton */}
      <section className="overflow-hidden rounded-[16px] border border-line bg-card shadow-xs">
        <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-ink p-4 sm:h-64 sm:min-h-0 sm:p-6">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-cyan/20 pointer-events-none" aria-hidden="true" />

          {/* Top Badges & Back Button */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full bg-paper/20" />
              <Skeleton className="h-6 w-36 rounded-full bg-paper/20" />
            </div>
            <Skeleton className="h-7 w-24 rounded-[6px] bg-paper/20" />
          </div>

          {/* Event Title & Metadata */}
          <div className="relative z-10 max-w-4xl pt-8">
            <Skeleton className="h-9 sm:h-10 w-3/4 max-w-lg rounded-[6px] bg-paper/20" />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-36 rounded-[4px] bg-paper/15" />
              <Skeleton className="h-4 w-52 rounded-[4px] bg-paper/15" />
            </div>
          </div>
        </div>

        {/* Action Toolbar Skeleton */}
        <div className="flex flex-col gap-3 border-t border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Skeleton className="h-4 w-48 rounded-[4px]" />
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-[6px]" />
            <Skeleton className="h-9 w-32 rounded-[6px]" />
            <Skeleton className="h-9 w-32 rounded-[6px]" />
          </div>
        </div>
      </section>

      {/* KPI Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative flex-1 min-w-0 w-full overflow-hidden rounded-[16px] bg-card border border-line shadow-xs flex flex-col justify-between p-4 sm:p-5 pb-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-4.5 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-[4px]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2.5">
                <Skeleton className="h-9 sm:h-10 w-24 rounded-[6px]" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            {/* Sparkline Curve Area Placeholder */}
            <div className="w-full mt-4 h-[88px] rounded-[8px] bg-canvas/60 p-2 flex items-end">
              <Skeleton className="w-full h-12 rounded-[4px] opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* People Tab Section Skeleton */}
      <section className="overflow-hidden rounded-[12px] border border-line bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-24 rounded-[4px]" />
            <Skeleton className="h-3.5 w-72 rounded-[4px]" />
          </div>
          <Skeleton className="h-9 w-full sm:w-72 rounded-[6px]" />
        </div>
        <EventPeopleTableSkeleton rowCount={5} />
      </section>
    </div>
  );
}

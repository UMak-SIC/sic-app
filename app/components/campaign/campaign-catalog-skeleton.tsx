import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CampaignCatalogSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <div
      className="flex flex-col gap-6 w-full pb-14 font-sans"
      aria-busy="true"
      aria-label="Loading announcements and campaigns"
    >
      {/* 1. KPI Sparkline Cards Row Skeleton (3 cards) */}
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
            <div className="w-full mt-4 h-[88px] rounded-[8px] bg-canvas/60 p-2 flex items-end">
              <Skeleton className="w-full h-12 rounded-[4px] opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Filter Bar & Search Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Skeleton className="h-9.5 w-full sm:w-80 rounded-[8px]" />
        <Skeleton className="h-4 w-32 rounded-[4px]" />
      </div>

      {/* 3. Visual Announcement Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="relative flex flex-col justify-between overflow-hidden rounded-[16px] bg-card border border-line shadow-xs"
          >
            {/* Top Media Banner Skeleton */}
            <div className="relative h-40 w-full p-3.5 flex flex-col justify-between bg-ink/80 overflow-hidden">
              <div className="flex justify-end">
                <Skeleton className="h-6 w-24 rounded-full bg-paper/20" />
              </div>
              <div className="mt-auto">
                <Skeleton className="h-6 w-28 rounded-full bg-paper/20" />
              </div>
            </div>

            {/* Card Body Skeleton */}
            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-3/4 rounded-[4px]" />
                <Skeleton className="h-3.5 w-full rounded-[4px]" />
                <Skeleton className="h-3.5 w-2/3 rounded-[4px]" />
              </div>

              {/* Card Footer Skeleton */}
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-24 rounded-[4px]" />
                    <Skeleton className="h-3 w-16 rounded-[4px]" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20 rounded-[4px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

export function CampaignWizardSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 w-full pb-16 font-sans"
      aria-busy="true"
      aria-label="Loading campaign wizard"
    >
      {/* 4-Step Guided Stepper Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
        <Skeleton className="h-12 w-full rounded-[9px]" />
        <Skeleton className="h-12 w-full rounded-[9px]" />
        <Skeleton className="h-12 w-full rounded-[9px]" />
        <Skeleton className="h-12 w-full rounded-[9px]" />
      </div>

      {/* Step 1 Content Skeleton */}
      <div className="flex flex-col gap-6 rounded-[16px] border border-line bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 rounded-[4px]" />
          <Skeleton className="h-4 w-80 rounded-[4px]" />
        </div>

        {/* Event Select Dropdown Skeleton */}
        <div className="flex flex-col gap-2 max-w-md">
          <Skeleton className="h-4 w-28 rounded-[4px]" />
          <Skeleton className="h-10 w-full rounded-[6px]" />
        </div>

        {/* Event Hero Card Skeleton */}
        <div className="rounded-[12px] border border-line overflow-hidden p-6 bg-canvas/30 flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-[8px]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-12 rounded-[6px]" />
            <Skeleton className="h-12 rounded-[6px]" />
            <Skeleton className="h-12 rounded-[6px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

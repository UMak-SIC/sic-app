"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EventStatus } from "./event-status-badge";

interface EventAttendanceMeterProps {
  current: number;
  capacity: number;
  totalTicks?: number;
  status?: EventStatus;
  className?: string;
}

export function EventAttendanceMeter({
  current,
  capacity,
  totalTicks = 14,
  status = "published",
  className,
}: EventAttendanceMeterProps) {
  const percentage = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
  const activeTicks = Math.round((percentage / 100) * totalTicks);

  const getTickColor = (isActive: boolean) => {
    if (!isActive) {
      return "bg-line/70 dark:bg-line/40";
    }
    if (status === "closed") {
      return "bg-ink/70 dark:bg-paper/70";
    }
    if (status === "draft") {
      return "bg-amber";
    }
    return "bg-green";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-[3px] py-1 cursor-default select-none",
              className
            )}
            aria-label={`${current} of ${capacity} (${percentage}%)`}
          >
            {Array.from({ length: totalTicks }).map((_, index) => {
              const isActive = index < activeTicks;
              return (
                <span
                  key={index}
                  className={cn(
                    "h-3 w-[3px] rounded-[1px] transition-colors duration-150",
                    getTickColor(isActive)
                  )}
                />
              );
            })}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px] font-sans">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-paper">
              {current} / {capacity} ({percentage}%)
            </span>
            <span className="text-muted-light text-[10px]">
              {status === "closed"
                ? "Final attendance"
                : status === "draft"
                ? "Draft target capacity"
                : "Confirmed attendees"}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

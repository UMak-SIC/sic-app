"use client";

import { cn } from "@/lib/utils";
import type { EventStatus } from "./event-status-badge";

interface EventAttendanceMeterProps {
  current: number;
  capacity: number;
  status: EventStatus;
  totalTicks?: number;
  className?: string;
}

const STATUS_COLOR: Record<EventStatus, string> = {
  published: "bg-green",
  draft: "bg-muted",
  closed: "bg-cyan",
};

export function EventAttendanceMeter({
  current,
  capacity,
  status,
  totalTicks = 16,
  className,
}: EventAttendanceMeterProps) {
  const fillRatio = capacity > 0 ? Math.min(1, current / capacity) : 0;
  const filledTicks = Math.round(fillRatio * totalTicks);
  const barColor = STATUS_COLOR[status] ?? "bg-muted";

  return (
    <div
      className={cn("flex items-center gap-[2px]", className)}
      aria-label={`${current} of ${capacity} registered`}
    >
      {Array.from({ length: totalTicks }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3 w-[3px] rounded-[1px] transition-all",
            i < filledTicks ? barColor : "bg-line"
          )}
        />
      ))}
    </div>
  );
}

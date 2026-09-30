/**
 * RosterCombMeter — attendance tick-comb visualization with vertical gradient bars.
 * Renders a row of small tick bars: filled gradient = attended, empty groove = absent.
 * Capped at 10 visible ticks; shows rate % as text fallback for 0-event students.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RosterCombMeterProps {
  rate: number; // 0–100
  totalEvents: number;
  attendedEvents: number;
  className?: string;
}

export function RosterCombMeter({
  rate,
  totalEvents,
  attendedEvents,
  className,
}: RosterCombMeterProps) {
  if (totalEvents === 0) {
    return (
      <span className="font-sans text-[11px] text-muted-light italic">
        No history
      </span>
    );
  }

  const MAX_TICKS = 10;
  const ticks = Math.min(totalEvents, MAX_TICKS);
  const filledTicks = Math.round((attendedEvents / totalEvents) * ticks);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="flex items-end gap-[3.5px] py-0.5"
        aria-label={`Attendance: ${attendedEvents} of ${totalEvents} events (${rate.toFixed(0)}%)`}
        title={`Attended ${attendedEvents} of ${totalEvents} events`}
      >
        {Array.from({ length: ticks }).map((_, i) => {
          const isFilled = i < filledTicks;
          return (
            <div
              key={i}
              className={cn(
                "w-[5px] rounded-full transition-all duration-200",
                isFilled
                  ? "h-[18px] shadow-[0_2px_6px_rgba(45,164,130,0.35)]"
                  : "h-2.5 bg-line/80 dark:bg-line/40 opacity-70"
              )}
              style={
                isFilled
                  ? {
                      background: "linear-gradient(180deg, #2da482 0%, #087f8c 100%)",
                    }
                  : undefined
              }
            />
          );
        })}
        {totalEvents > MAX_TICKS && (
          <span className="ml-1 font-sans text-[9px] font-bold text-muted self-end leading-none">
            +{totalEvents - MAX_TICKS}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "font-sans text-[11px] font-extrabold tabular-nums tracking-tight",
            rate >= 80 ? "text-green" : rate >= 50 ? "text-amber" : "text-red"
          )}
        >
          {rate.toFixed(0)}%
        </span>
        <span className="font-sans text-[9.5px] text-muted font-medium">
          ({attendedEvents}/{totalEvents})
        </span>
      </div>
    </div>
  );
}

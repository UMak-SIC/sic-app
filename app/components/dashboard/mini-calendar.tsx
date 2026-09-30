"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
  eventDays?: number[];
  monthName?: string;
  className?: string;
}

export function MiniCalendar({
  selectedDay: controlledDay,
  onSelectDay,
  eventDays = [15, 22, 28],
  monthName = "May 2024",
  className,
}: MiniCalendarProps) {
  const [internalDay, setInternalDay] = useState<number>(15);
  const selectedDay = controlledDay !== undefined ? controlledDay : internalDay;

  const handleSelectDay = (day: number) => {
    if (onSelectDay) {
      onSelectDay(day);
    } else {
      setInternalDay(day);
    }
  };

  const daysOfWeek = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  // Days configuration for May 2024 (starts on Wednesday, so 2 empty cells)
  const emptyDaysBefore = [null, null];
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 md:p-6 shadow-2xs h-auto min-h-[340px] sm:h-[360px]",
        className
      )}
    >
      {/* Month Selector Navigation */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <CaretLeft size={14} weight="bold" />
        </button>

        <div className="rounded-full bg-[#1e8e6b] px-3.5 py-0.5 text-xs font-bold text-white shadow-2xs">
          {monthName}
        </div>

        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center mb-1">
        {daysOfWeek.map((day) => (
          <span
            key={day}
            className="text-[10px] sm:text-[11px] font-semibold text-slate-400 py-0.5"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid (Fixed Dimensions) */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center flex-1 content-center">
        {emptyDaysBefore.map((_, i) => (
          <div key={`empty-${i}`} className="h-7 w-7 sm:h-8 sm:w-8 mx-auto" />
        ))}

        {daysInMonth.map((day) => {
          const isSelected = day === selectedDay;
          const hasEvent = eventDays.includes(day);

          return (
            <button
              key={day}
              onClick={() => handleSelectDay(day)}
              className={cn(
                "relative flex h-7 w-7 sm:h-8 sm:w-8 mx-auto items-center justify-center rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                isSelected
                  ? "bg-[#1e8e6b] text-white font-bold shadow-xs scale-105 z-10"
                  : hasEvent
                  ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-300/60 hover:bg-emerald-100/90"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

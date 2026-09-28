"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MiniCalendar() {
  const [selectedDay, setSelectedDay] = useState<number>(15);

  const daysOfWeek = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  // Days configuration for May 2024 (starts on Wednesday, so 2 empty cells)
  const emptyDaysBefore = [null, null]; // Mon, Tue empty
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-6 shadow-2xs">
      {/* Month Selector Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="rounded-full bg-[#1e8e6b] px-4 py-1 text-xs font-bold text-white shadow-2xs">
          May 2024
        </div>

        <button
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((day) => (
          <span
            key={day}
            className="text-[11px] font-semibold text-slate-500 py-1"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {emptyDaysBefore.map((_, i) => (
          <div key={`empty-${i}`} className="h-8 w-8" />
        ))}

        {daysInMonth.map((day) => {
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-medium transition-all duration-150 cursor-pointer",
                isSelected
                  ? "bg-[#1e8e6b] text-white font-bold shadow-xs scale-105"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

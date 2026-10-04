"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  eventDates: string[];
  month: Date;
  onMonthChange: (month: Date) => void;
  className?: string;
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  eventDates,
  month,
  onMonthChange,
  className,
}: MiniCalendarProps) {
  const daysOfWeek = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(month);
  const emptyDaysBefore = Array.from(
    { length: (new Date(year, monthIndex, 1).getDay() + 6) % 7 },
  );
  const daysInMonth = Array.from(
    { length: new Date(year, monthIndex + 1, 0).getDate() },
    (_, index) => index + 1,
  );

  const dateKey = (day: number) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

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
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <CaretLeft size={14} weight="bold" />
        </button>

        <div className="rounded-full bg-[#1e8e6b] px-3.5 py-0.5 text-xs font-bold text-white shadow-2xs">
          {monthName}
        </div>

        <button
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
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
          const date = dateKey(day);
          const isSelected = date === selectedDate;
          const hasEvent = eventDates.includes(date);

          return (
            <button
              key={day}
                onClick={() => onSelectDate(date)}
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

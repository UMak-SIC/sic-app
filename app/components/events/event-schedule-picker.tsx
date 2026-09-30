"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { TimePickerPopover } from "./time-picker-popover";
import { cn } from "@/lib/utils";

export interface EventSchedulePickerProps {
  startDate: Date;
  onStartDateChange: (d: Date) => void;
  startTime: string;
  onStartTimeChange: (t: string) => void;
  endDate: Date;
  onEndDateChange: (d: Date) => void;
  endTime: string;
  onEndTimeChange: (t: string) => void;
  isSameDay: boolean;
  onIsSameDayChange: (v: boolean) => void;
  className?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameCalendarDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateLong(d: Date) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function EventSchedulePicker({
  startDate,
  onStartDateChange,
  startTime,
  onStartTimeChange,
  endDate,
  onEndDateChange,
  endTime,
  onEndTimeChange,
  isSameDay,
  onIsSameDayChange,
  className,
}: EventSchedulePickerProps) {
  // Calendar viewport (month/year currently viewed)
  const [prevStartDate, setPrevStartDate] = React.useState(startDate);
  const [viewYear, setViewYear] = React.useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(startDate.getMonth());
  const [isSelectingRange, setIsSelectingRange] = React.useState(false);

  if (prevStartDate !== startDate) {
    setPrevStartDate(startDate);
    setViewYear(startDate.getFullYear());
    setViewMonth(startDate.getMonth());
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar matrix (Monday-first)
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Monday-based day of week index: 0 = Mon, 6 = Sun
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(viewYear, viewMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push({
        date: new Date(viewYear, viewMonth, day),
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to fill grid to 35 or 42
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        date: new Date(viewYear, viewMonth + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleDayClick = (clickedDate: Date) => {
    if (isSameDay) {
      onStartDateChange(clickedDate);
      onEndDateChange(clickedDate);
      setIsSelectingRange(false);
      return;
    }

    if (!isSelectingRange) {
      // First click of range: set start date
      onStartDateChange(clickedDate);
      onEndDateChange(clickedDate);
      setIsSelectingRange(true);
    } else {
      // Second click of range
      if (clickedDate < startDate) {
        onStartDateChange(clickedDate);
        onEndDateChange(startDate);
      } else {
        onEndDateChange(clickedDate);
      }
      setIsSelectingRange(false);
    }
  };

  const handleSameDayToggle = (enabled: boolean) => {
    onIsSameDayChange(enabled);
    if (enabled) {
      onEndDateChange(startDate);
      setIsSelectingRange(false);
    }
  };

  return (
    <div className={cn("grid grid-cols-1 xl:grid-cols-12 gap-5 font-sans items-start w-full", className)}>
      {/* Left Sub-Column: Green Mini Calendar */}
      <div className="xl:col-span-7 flex flex-col p-3.5 rounded-2xl bg-white dark:bg-card border border-line shadow-2xs">
        {/* Month Selector Header */}
        <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-line-subtle">
          <button
            type="button"
            aria-label="Previous Month"
            onClick={handlePrevMonth}
            className="flex items-center justify-center size-7 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="font-display text-sm font-bold text-ink">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            aria-label="Next Month"
            onClick={handleNextMonth}
            className="flex items-center justify-center size-7 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Days of the Week Header */}
        <div className="grid grid-cols-7 text-center mb-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="font-sans text-[11px] font-semibold text-muted/70 py-1"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Matrix Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const isStart = isSameCalendarDay(date, startDate);
            const isEnd = isSameCalendarDay(date, endDate);
            const isBetween =
              !isSameDay &&
              date > startDate &&
              date < endDate;
            const isSingleDaySelected = isStart && isEnd;

            return (
              <div
                key={idx}
                className={cn(
                  "relative flex items-center justify-center h-8 transition-colors",
                  isBetween && "bg-[#2da482]/15",
                  isStart && !isSingleDaySelected && "bg-gradient-to-r from-transparent to-[#2da482]/15 rounded-l-full",
                  isEnd && !isSingleDaySelected && "bg-gradient-to-l from-transparent to-[#2da482]/15 rounded-r-full"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "flex size-7 items-center justify-center font-sans text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                    // Current month vs adjacent
                    isCurrentMonth ? "text-ink" : "text-muted/40",
                    // Highlight start or end
                    (isStart || isEnd) &&
                      "bg-[#2da482] text-white font-bold rounded-full shadow-xs hover:bg-[#269374] scale-105 z-10",
                    // In-between dates
                    isBetween && "text-ink font-semibold",
                    // Hover state when not selected
                    !isStart &&
                      !isEnd &&
                      "hover:bg-[#2da482]/20 hover:text-ink rounded-full"
                  )}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sub-Column: Start/End Form & Same Day Switch (Items Align Start) */}
      <div className="xl:col-span-5 flex flex-col items-start justify-start gap-4 text-left w-full">
        {/* Start Date & Time Field (Clock below Date) */}
        <div className="flex flex-col items-start gap-1.5 w-full">
          <label className="text-xs font-bold text-ink">
            Start date<span className="text-[#2da482] ml-0.5">*</span>
          </label>
          <div className="flex flex-col gap-1.5 w-full rounded-xl border border-line bg-white dark:bg-card p-2 shadow-2xs">
            <div className="flex items-center justify-start text-left px-1.5 py-0.5 text-xs font-semibold text-ink truncate">
              {formatDateLong(startDate)}
            </div>
            <div className="w-full">
              <TimePickerPopover
                value={startTime}
                onChange={onStartTimeChange}
              />
            </div>
          </div>
        </div>

        {/* End Date & Time Field (Clock below Date) */}
        <div className="flex flex-col items-start gap-1.5 w-full">
          <label className="text-xs font-bold text-ink">
            End date<span className="text-[#2da482] ml-0.5">*</span>
          </label>
          <div
            className={cn(
              "flex flex-col gap-1.5 w-full rounded-xl border border-line bg-white dark:bg-card p-2 shadow-2xs transition-opacity",
              isSameDay && "opacity-75 bg-canvas/40"
            )}
          >
            <div className="flex items-center justify-start text-left px-1.5 py-0.5 text-xs font-semibold text-ink truncate">
              {formatDateLong(endDate)}
            </div>
            <div className="w-full">
              <TimePickerPopover
                value={endTime}
                onChange={onEndTimeChange}
                disabled={isSameDay}
              />
            </div>
          </div>
        </div>

        {/* Same Day Toggle + Minimal Instruction */}
        <div className="flex flex-col gap-1.5 w-full pt-1">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink select-none">
              Same Day
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isSameDay}
              onClick={() => handleSameDayToggle(!isSameDay)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2da482]",
                isSameDay ? "bg-[#2da482]" : "bg-line"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  isSameDay ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
          {/* Super Minimal Instruction */}
          <p className="text-[11px] text-muted font-normal leading-tight">
            Enable for single-day events, or pick a start and end range on the calendar.
          </p>
        </div>
      </div>
    </div>
  );
}

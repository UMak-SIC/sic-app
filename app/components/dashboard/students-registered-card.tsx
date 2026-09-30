"use client";

import { useState } from "react";
import { DonutChart } from "./donut-chart";
import { DashboardEvent, DASHBOARD_EVENTS } from "./events-data";
import { cn } from "@/lib/utils";

interface StudentsRegisteredCardProps {
  event?: DashboardEvent;
  className?: string;
}

export function StudentsRegisteredCard({
  event = DASHBOARD_EVENTS[0],
  className,
}: StudentsRegisteredCardProps) {
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);

  const collegeData = event.collegeBreakdown;
  const totalStudents = collegeData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div
      className={cn(
        "flex flex-col min-h-[370px] justify-between rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-7 shadow-2xs",
        className
      )}
    >
      {/* Header with explicit Event Title and Formatted Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 tracking-tight">
            Students Registered: {event.title}
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            College distribution for {event.dateFormatted} ({totalStudents} registered)
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200/80 shrink-0">
          <span className="h-2 w-2 rounded-full bg-[#1e8e6b] animate-pulse" />
          <span className="text-xs font-semibold text-emerald-800">
            {totalStudents} Registered
          </span>
        </div>
      </div>

      {/* Donut Chart Component */}
      <div className="flex items-center justify-center py-2 flex-1 w-full">
        <DonutChart
          data={collegeData}
          total={`${totalStudents}`}
          label="Total"
          selected={selectedCollege}
          onSelect={(name) =>
            setSelectedCollege(selectedCollege === name ? null : name)
          }
          formatValue={(val) => `${val} std`}
        />
      </div>
    </div>
  );
}

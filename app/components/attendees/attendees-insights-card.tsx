"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Clock,
  CalendarBlank,
  CheckCircle,
  HourglassMedium,
  Users,
  TrendUp,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Checkpoint timeline data during the event check-in window
const TIMELINE_DATA = [
  { label: "1:00 PM", attended: 12, pending: 102, absent: 4 },
  { label: "1:30 PM", attended: 28, pending: 84, absent: 6 },
  { label: "2:00 PM", attended: 48, pending: 62, absent: 8 },
  { label: "2:30 PM", attended: 64, pending: 45, absent: 9 },
  { label: "3:00 PM", attended: 71, pending: 38, absent: 9 },
  { label: "3:30 PM", attended: 71, pending: 38, absent: 9 },
];

// Historical comparison across recent UMak SIC events
const PAST_EVENTS_DATA = [
  { label: "Gen Assembly", attended: 71, pending: 38, absent: 9 },
  { label: "Cloud 101", attended: 42, pending: 6, absent: 0 },
  { label: "UX Sprint", attended: 65, pending: 7, absent: 0 },
  { label: "Tech Summit", attended: 138, pending: 4, absent: 0 },
  { label: "Cyber Sec", attended: 45, pending: 5, absent: 0 },
  { label: "Hackathon", attended: 91, pending: 4, absent: 0 },
];

interface AttendeesInsightsCardProps {
  totalCount?: number;
  attendedCount?: number;
  pendingCount?: number;
  absentCount?: number;
  className?: string;
}

export function AttendeesInsightsCard({
  totalCount = 118,
  attendedCount = 71,
  pendingCount = 38,
  absentCount = 9,
  className,
}: AttendeesInsightsCardProps) {
  const [activeView, setActiveView] = React.useState<"timeline" | "history">("timeline");

  const chartData = activeView === "timeline" ? TIMELINE_DATA : PAST_EVENTS_DATA;

  const attendanceRate = totalCount
    ? Math.round((attendedCount / totalCount) * 100)
    : 0;

  const pendingRate = totalCount
    ? Math.round((pendingCount / totalCount) * 100)
    : 0;

  return (
    <Card
      className={cn(
        "flex flex-col rounded-[12px] border border-line bg-card p-6 shadow-xs font-sans",
        className
      )}
    >
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-ink tracking-tight">
            Attendee Insights
          </h2>
          <p className="text-xs text-muted font-sans mt-0.5">
            Attendance check-in flow and roster status breakdown
          </p>
        </div>

        {/* Simplified 2-option Segmented Switcher */}
        <div className="flex items-center rounded-lg bg-canvas p-1 border border-line/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView("timeline")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer font-sans",
              activeView === "timeline"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            <Clock size={14} weight="bold" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("history")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer font-sans",
              activeView === "history"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            <CalendarBlank size={14} weight="bold" />
            <span>Past Events</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chart on Left, Key Metrics on Right */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        {/* Left Column: Grouped 3-Bar Chart with Green & Cyan Palette */}
        <div className="lg:col-span-8 flex flex-col h-full justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-muted uppercase tracking-wider font-sans">
              {activeView === "timeline"
                ? "Live Check-in Progression"
                : "Attendance Outcome by Event"}
            </span>

            {/* Legend adhering to UMak Green & Cyan */}
            <div className="flex items-center gap-4 text-[11px] font-sans text-muted">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#176c59]" />
                <span className="text-ink font-medium">Attended</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#087f8c]" />
                <span className="text-ink font-medium">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#12333a]" />
                <span className="text-ink font-medium">Absent</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Container - Takes full vertical height */}
          <div className="flex-1 min-h-[300px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e7eeee"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#607579", fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#607579", fontSize: 11 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(8, 127, 140, 0.04)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-[8px] border border-line bg-white p-3 shadow-md font-sans text-xs">
                          <p className="font-bold text-ink mb-1.5">{label}</p>
                          <div className="space-y-1">
                            <p className="flex items-center justify-between gap-4 text-[#176c59]">
                              <span>Attended:</span>
                              <span className="font-bold">{payload[0]?.value}</span>
                            </p>
                            <p className="flex items-center justify-between gap-4 text-[#087f8c]">
                              <span>Pending:</span>
                              <span className="font-bold">{payload[1]?.value}</span>
                            </p>
                            <p className="flex items-center justify-between gap-4 text-[#12333a]">
                              <span>Absent:</span>
                              <span className="font-bold">{payload[2]?.value}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Attended Bar — UMak Green (#176c59) */}
                <Bar
                  dataKey="attended"
                  fill="#176c59"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                {/* Pending Bar — UMak Cyan (#087f8c) */}
                <Bar
                  dataKey="pending"
                  fill="#087f8c"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                {/* Absent Bar — Ink (#12333a) */}
                <Bar
                  dataKey="absent"
                  fill="#12333a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: 3 Clean Neutral Metric Cards (No Tinted Backgrounds) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 h-full">
          <span className="text-xs font-bold text-muted uppercase tracking-wider font-sans mb-0.5">
            Key Metrics
          </span>

          {/* Metric 1: Total Registered */}
          <div className="flex-1 rounded-[10px] border border-line/80 bg-white p-4 shadow-2xs hover:border-cyan/40 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold text-ink font-sans">
                Total Registered
              </span>
              <Users size={16} weight="bold" className="text-muted" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-ink tracking-tight">
              {totalCount}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#176c59] font-sans">
              <TrendUp size={13} weight="bold" />
              <span>Published event · 150 capacity</span>
            </div>
          </div>

          {/* Metric 2: Attendance Rate */}
          <div className="flex-1 rounded-[10px] border border-line/80 bg-white p-4 shadow-2xs hover:border-cyan/40 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold text-ink font-sans">
                Attendance Rate
              </span>
              <CheckCircle size={16} weight="bold" className="text-[#176c59]" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-ink tracking-tight">
              {attendanceRate}%
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#176c59] font-sans">
              <TrendUp size={13} weight="bold" />
              <span>{attendedCount} verified check-ins</span>
            </div>
          </div>

          {/* Metric 3: Pending Check-in */}
          <div className="flex-1 rounded-[10px] border border-line/80 bg-white p-4 shadow-2xs hover:border-cyan/40 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold text-ink font-sans">
                Awaiting Check-in
              </span>
              <HourglassMedium size={16} weight="bold" className="text-[#087f8c]" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-ink tracking-tight">
              {pendingCount}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted font-sans">
              <span>{pendingRate}% remaining · {absentCount} absent</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

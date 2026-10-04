"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const timeRanges = ["Last 3 months", "Last 30 days", "Last 7 days"] as const;

type TrendPoint = { date: string; primary: number; secondary: number };
type AttendanceEvent = { startsAt: string; attended: number; onRoster: number };

function rangeStart(range: (typeof timeRanges)[number]) {
  const days = range === "Last 7 days" ? 7 : range === "Last 30 days" ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return start;
}

export function AttendanceTrendChart({ className }: { className?: string }) {
  const [selectedRange, setSelectedRange] = React.useState<(typeof timeRanges)[number]>("Last 30 days");
  const [chartData, setChartData] = React.useState<TrendPoint[]>([]);

  const loadAttendanceTrend = React.useCallback(async () => {
    const response = await fetch("/api/attendees/insights");
    if (!response.ok) return;

    const { events, timezone } = await response.json() as {
      events: AttendanceEvent[];
      timezone: string;
    };
    const now = Date.now();
    const start = rangeStart(selectedRange);
    const dateFormat = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: timezone,
    });

    setChartData(
      events
        .filter((event) => {
          const startsAt = new Date(event.startsAt).getTime();
          return startsAt >= start.getTime() && startsAt <= now;
        })
        .map((event) => ({
          date: dateFormat.format(new Date(event.startsAt)),
          primary: event.attended,
          secondary: event.onRoster,
        })),
    );
  }, [selectedRange]);

  React.useEffect(() => {
    void Promise.resolve().then(loadAttendanceTrend);
  }, [loadAttendanceTrend]);

  return (
    <div
      className={cn(
        "flex flex-col min-h-[380px] sm:min-h-[500px] rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-6 shadow-2xs",
        className
      )}
    >
      {/* Header with Title & Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900">
            Attendance Trend
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Total number of attended in the event
          </p>
        </div>

        {/* Range Selector Pills */}
        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto rounded-xl bg-slate-50 p-1 border border-slate-200/60">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                "rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer",
                selectedRange === range
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] sm:h-[380px] w-full pt-1 sm:pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="primaryGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e8e6b" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#1e8e6b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="secondaryGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#48bb78" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#48bb78" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xs">
                      <div className="font-semibold text-slate-900 mb-1">
                        {label}
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700 font-medium">
                        <span>Attended:</span>
                        <span className="font-bold font-mono">
                          {payload[0].value}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <span>Registered:</span>
                        <span className="font-bold font-mono">{payload[1]?.value ?? 0}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="primary"
              stroke="#1e8e6b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#primaryGreen)"
            />

            <Area
              type="monotone"
              dataKey="secondary"
              stroke="#48bb78"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              fillOpacity={1}
              fill="url(#secondaryGreen)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

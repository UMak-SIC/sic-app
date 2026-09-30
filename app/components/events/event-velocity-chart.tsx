"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from "recharts";
import { Info, TrendUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type MetricSeriesFilter = "all" | "registered" | "emails" | "attended";

interface ActivityTimelineDatum {
  time: string;
  registered: number;
  emails: number;
  attended: number;
  isNow?: boolean;
}

const TIMELINE_DATA: ActivityTimelineDatum[] = [
  { time: "12:00", registered: 45, emails: 42, attended: 12 },
  { time: "13:00", registered: 82, emails: 78, attended: 28 },
  { time: "14:00", registered: 104, emails: 98, attended: 54 },
  { time: "14:30", registered: 118, emails: 109, attended: 71, isNow: true },
  { time: "15:00", registered: 118, emails: 109, attended: 71 },
  { time: "16:00", registered: 118, emails: 109, attended: 71 },
];

export function EventVelocityChart({ className }: { className?: string }) {
  const [selectedMetric, setSelectedMetric] = React.useState<MetricSeriesFilter>("all");

  const isAll = selectedMetric === "all";

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Top Header & Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-5 pb-3">
        <h2 className="font-display text-base sm:text-lg font-bold text-ink tracking-tight">
          Event Activity
        </h2>

        {/* Clean Pill Filter Tabs (Mockup-aligned) */}
        <div
          role="group"
          aria-label="Filter series"
          className="flex items-center gap-1 rounded-full bg-canvas/60 p-1 border border-line-subtle overflow-x-auto max-w-full"
        >
          <button
            type="button"
            onClick={() => setSelectedMetric("all")}
            aria-pressed={isAll}
            className={cn(
              "rounded-full px-2.5 sm:px-3 py-1 font-sans text-xs font-semibold transition-all cursor-pointer shrink-0",
              isAll
                ? "bg-card text-ink shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("registered")}
            aria-pressed={selectedMetric === "registered"}
            className={cn(
              "rounded-full px-2.5 sm:px-3 py-1 font-sans text-xs font-medium transition-all cursor-pointer shrink-0",
              selectedMetric === "registered"
                ? "bg-card font-semibold text-cyan shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            Registrations
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("emails")}
            aria-pressed={selectedMetric === "emails"}
            className={cn(
              "rounded-full px-2.5 sm:px-3 py-1 font-sans text-xs font-medium transition-all cursor-pointer shrink-0",
              selectedMetric === "emails"
                ? "bg-card font-semibold text-green shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            Emails sent
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("attended")}
            aria-pressed={selectedMetric === "attended"}
            className={cn(
              "rounded-full px-2.5 sm:px-3 py-1 font-sans text-xs font-medium transition-all cursor-pointer shrink-0",
              selectedMetric === "attended"
                ? "bg-card font-semibold text-amber shadow-xs"
                : "text-muted hover:text-ink"
            )}
          >
            Attended
          </button>
        </div>
      </div>

      {/* 3 Metric Headers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line-subtle border-y border-line-subtle">
        {/* Metric 1: Registrations */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "registered" ? "all" : "registered")}
          className={cn(
            "flex flex-col gap-1 px-4 sm:px-6 py-3.5 sm:py-4 cursor-pointer transition-colors",
            selectedMetric === "registered" ? "bg-canvas/40" : "hover:bg-canvas/20"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-cyan shrink-0" />
              <span className="font-sans text-xs font-semibold text-ink">
                Registrations
              </span>
            </div>
            <span title="Total registered students">
              <Info size={15} className="text-muted-light" />
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-bold text-ink tabular-nums tracking-tight">
              118
            </span>
            <span className="inline-flex items-center gap-0.5 font-sans text-xs font-semibold text-green">
              <TrendUp size={13} weight="bold" />
              +8%
            </span>
          </div>

          <span className="font-sans text-[11px] text-muted">
            vs previous event
          </span>
        </div>

        {/* Metric 2: Emails Sent */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "emails" ? "all" : "emails")}
          className={cn(
            "flex flex-col gap-1 px-6 py-4 cursor-pointer transition-colors",
            selectedMetric === "emails" ? "bg-canvas/40" : "hover:bg-canvas/20"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-green shrink-0" />
              <span className="font-sans text-xs font-semibold text-ink">
                Emails sent
              </span>
            </div>
            <span title="Confirmation emails delivered">
              <Info size={15} className="text-muted-light" />
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-bold text-ink tabular-nums tracking-tight">
              109
            </span>
            <span className="inline-flex items-center gap-0.5 font-sans text-xs font-semibold text-green">
              <TrendUp size={13} weight="bold" />
              +5%
            </span>
          </div>

          <span className="font-sans text-[11px] text-muted">
            92% delivery rate
          </span>
        </div>

        {/* Metric 3: Attended */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "attended" ? "all" : "attended")}
          className={cn(
            "flex flex-col gap-1 px-6 py-4 cursor-pointer transition-colors",
            selectedMetric === "attended" ? "bg-canvas/40" : "hover:bg-canvas/20"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-amber shrink-0" />
              <span className="font-sans text-xs font-semibold text-ink">
                Attended
              </span>
            </div>
            <span title="Students present at the event">
              <Info size={15} className="text-muted-light" />
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-bold text-ink tabular-nums tracking-tight">
              71
            </span>
            <span className="inline-flex items-center gap-0.5 font-sans text-xs font-semibold text-green">
              <TrendUp size={13} weight="bold" />
              +12%
            </span>
          </div>

          <span className="font-sans text-[11px] text-muted">
            60% turnout rate
          </span>
        </div>
      </div>

      {/* Styled Gradient Bar Chart Canvas */}
      <div className="h-60 w-full px-4 pt-5 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={TIMELINE_DATA}
            margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
            barGap={4}
          >
            <defs>
              {/* Green Gradient for Attended */}
              <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2da482" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#2da482" stopOpacity={0.3} />
              </linearGradient>

              {/* Cyan Gradient for Registrations */}
              <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#087f8c" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#087f8c" stopOpacity={0.3} />
              </linearGradient>

              {/* Teal Gradient for Emails Sent */}
              <linearGradient id="barGradientEmails" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#176c59" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#176c59" stopOpacity={0.25} />
              </linearGradient>

              {/* Glowing gradient for current 'Now' bar */}
              <linearGradient id="barGradientNow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#087f8c" stopOpacity={1} />
                <stop offset="100%" stopColor="#2da482" stopOpacity={0.7} />
              </linearGradient>
            </defs>

            {/* Subtle Vertical Gridlines like mockup */}
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#e7eeee"
              vertical={true}
              horizontal={true}
            />

            {/* Shaded vertical zone for 'Now' time marker like in mockup */}
            <ReferenceArea
              x1="14:00"
              x2="14:30"
              fill="#087f8c"
              fillOpacity={0.06}
            />

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => {
                const isCurrent = payload.value === "14:30";
                return (
                  <text
                    x={x}
                    y={Number(y) + 12}
                    textAnchor="middle"
                    fill={isCurrent ? "#087f8c" : "#607579"}
                    fontSize={11}
                    fontWeight={isCurrent ? 700 : 500}
                    fontFamily="Montserrat"
                  >
                    {isCurrent ? "Now, 14:30" : payload.value}
                  </text>
                );
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#607579", fontSize: 11, fontFamily: "Montserrat" }}
              domain={[0, 130]}
            />

            <Tooltip
              cursor={{ fill: "rgba(8, 127, 140, 0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-[8px] border border-line bg-card p-2.5 shadow-md font-sans text-xs">
                    <p className="font-semibold text-ink border-b border-line-subtle pb-1 mb-1.5">
                      {label === "14:30" ? "Current Time (14:30)" : `Time: ${label}`}
                    </p>
                    <div className="flex flex-col gap-1">
                      {payload.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name === "registered"
                              ? "Registrations"
                              : entry.name === "emails"
                              ? "Emails Sent"
                              : "Attended"}
                          </span>
                          <span className="font-bold text-ink tabular-nums">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />

            {/* Registrations Bar */}
            {(isAll || selectedMetric === "registered") && (
              <Bar
                dataKey="registered"
                name="registered"
                fill="url(#barGradientCyan)"
                radius={[4, 4, 0, 0]}
                maxBarSize={isAll ? 24 : 44}
              />
            )}

            {/* Emails Sent Bar */}
            {(isAll || selectedMetric === "emails") && (
              <Bar
                dataKey="emails"
                name="emails"
                fill="url(#barGradientEmails)"
                radius={[4, 4, 0, 0]}
                maxBarSize={isAll ? 24 : 44}
              />
            )}

            {/* Attended Bar */}
            {(isAll || selectedMetric === "attended") && (
              <Bar
                dataKey="attended"
                name="attended"
                fill="url(#barGradientGreen)"
                radius={[4, 4, 0, 0]}
                maxBarSize={isAll ? 24 : 44}
              >
                {TIMELINE_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isNow ? "url(#barGradientNow)" : "url(#barGradientGreen)"}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Meta */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-t border-line-subtle font-sans text-xs text-muted">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-cyan" />
            Registrations
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[#176c59]" />
            Emails sent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-green" />
            Attended
          </span>
        </div>

        <span className="text-[11px] text-muted-light">
          Real-time event attendance pace
        </span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const hourlyVelocityData = [
  { time: "12:00 PM", count: 4, cumulative: 4 },
  { time: "1:00 PM", count: 12, cumulative: 16 },
  { time: "1:30 PM", count: 28, cumulative: 44 },
  { time: "2:00 PM", count: 22, cumulative: 66 },
  { time: "2:30 PM", count: 5, cumulative: 71 },
  { time: "3:00 PM", count: 0, cumulative: 71 },
];

const dailyRegistrationData = [
  { time: "10 Oct", count: 18, cumulative: 18 },
  { time: "11 Oct", count: 24, cumulative: 42 },
  { time: "12 Oct", count: 19, cumulative: 61 },
  { time: "13 Oct", count: 22, cumulative: 83 },
  { time: "14 Oct", count: 15, cumulative: 98 },
  { time: "15 Oct", count: 12, cumulative: 110 },
  { time: "16 Oct", count: 8, cumulative: 118 },
];

const FALLBACK_COLORS = {
  interval: "#087f8c",
  cumulative: "#2da482",
  grid: "#e7eeee",
  axis: "#607579",
};

function readChartColors() {
  if (typeof window === "undefined") return FALLBACK_COLORS;

  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    interval: read("--cyan", FALLBACK_COLORS.interval),
    cumulative: read("--green", FALLBACK_COLORS.cumulative),
    grid: read("--line-subtle", FALLBACK_COLORS.grid),
    axis: read("--muted", FALLBACK_COLORS.axis),
  };
}

interface EventVelocityChartProps {
  className?: string;
}

export function EventVelocityChart({ className }: EventVelocityChartProps) {
  const [metricView, setMetricView] = React.useState<"hourly" | "daily">(
    "hourly"
  );
  const [colors] = React.useState(readChartColors);

  const isHourly = metricView === "hourly";
  const data = isHourly ? hourlyVelocityData : dailyRegistrationData;

  const chartConfig = {
    count: {
      label: isHourly ? "Scans per hour" : "Registrations per day",
      color: colors.interval,
    },
    cumulative: {
      label: isHourly ? "Total checked in" : "Total roster",
      color: colors.cumulative,
    },
  } satisfies ChartConfig;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[12px] border border-line bg-card p-5 shadow-2xs",
        className
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-sm font-bold text-ink">
          {isHourly ? "Check-in velocity" : "Registration timeline"}
        </h2>

        <div
          role="group"
          aria-label="Chart range"
          className="flex items-center gap-1 self-start rounded-[8px] bg-canvas/70 p-1 sm:self-auto"
        >
          <button
            type="button"
            aria-pressed={isHourly}
            onClick={() => setMetricView("hourly")}
            className={cn(
              "rounded-[6px] px-2.5 py-1 font-sans text-xs transition-colors cursor-pointer",
              isHourly
                ? "bg-card font-semibold text-ink shadow-2xs"
                : "text-muted hover:text-ink"
            )}
          >
            Live scans
          </button>
          <button
            type="button"
            aria-pressed={!isHourly}
            onClick={() => setMetricView("daily")}
            className={cn(
              "rounded-[6px] px-2.5 py-1 font-sans text-xs transition-colors cursor-pointer",
              !isHourly
                ? "bg-card font-semibold text-ink shadow-2xs"
                : "text-muted hover:text-ink"
            )}
          >
            7-day roster
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke={colors.grid}
            />

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.axis, fontSize: 11 }}
              dy={6}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.axis, fontSize: 11 }}
              width={36}
            />

            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="rounded-[8px] border-line bg-card font-sans text-xs text-ink shadow-md [&_.font-mono]:font-sans"
                />
              }
            />

            <Bar
              dataKey="count"
              name="count"
              fill={colors.interval}
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />

            <Line
              dataKey="cumulative"
              name="cumulative"
              stroke={colors.cumulative}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: colors.interval }}
          />
          {isHourly ? "Scans per hour" : "Registrations per day"}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-3 rounded-full"
            style={{ backgroundColor: colors.cumulative }}
          />
          {isHourly ? "Total checked in" : "Total roster"}
        </span>
      </div>
    </div>
  );
}

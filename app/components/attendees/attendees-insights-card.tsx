"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export const description = "An interactive bar chart for CCIS courses";

const chartData = [
  { date: "2024-04-01", bsit: 222, bscs: 150, bsins: 90 },
  { date: "2024-04-02", bsit: 97, bscs: 180, bsins: 60 },
  { date: "2024-04-03", bsit: 167, bscs: 120, bsins: 85 },
  { date: "2024-04-04", bsit: 242, bscs: 260, bsins: 110 },
  { date: "2024-04-05", bsit: 373, bscs: 290, bsins: 140 },
  { date: "2024-04-06", bsit: 301, bscs: 340, bsins: 130 },
  { date: "2024-04-07", bsit: 245, bscs: 180, bsins: 95 },
  { date: "2024-04-08", bsit: 409, bscs: 320, bsins: 160 },
  { date: "2024-04-09", bsit: 59, bscs: 110, bsins: 45 },
  { date: "2024-04-10", bsit: 261, bscs: 190, bsins: 115 },
  { date: "2024-04-11", bsit: 327, bscs: 350, bsins: 145 },
  { date: "2024-04-12", bsit: 292, bscs: 210, bsins: 125 },
  { date: "2024-04-13", bsit: 342, bscs: 380, bsins: 155 },
  { date: "2024-04-14", bsit: 137, bscs: 220, bsins: 80 },
  { date: "2024-04-15", bsit: 120, bscs: 170, bsins: 75 },
  { date: "2024-04-16", bsit: 138, bscs: 190, bsins: 85 },
  { date: "2024-04-17", bsit: 446, bscs: 360, bsins: 190 },
  { date: "2024-04-18", bsit: 364, bscs: 410, bsins: 175 },
  { date: "2024-04-19", bsit: 243, bscs: 180, bsins: 105 },
  { date: "2024-04-20", bsit: 89, bscs: 150, bsins: 55 },
  { date: "2024-04-21", bsit: 137, bscs: 200, bsins: 85 },
  { date: "2024-04-22", bsit: 224, bscs: 170, bsins: 95 },
  { date: "2024-04-23", bsit: 138, bscs: 230, bsins: 90 },
  { date: "2024-04-24", bsit: 387, bscs: 290, bsins: 165 },
  { date: "2024-04-25", bsit: 215, bscs: 250, bsins: 110 },
  { date: "2024-04-26", bsit: 75, bscs: 130, bsins: 50 },
  { date: "2024-04-27", bsit: 383, bscs: 420, bsins: 180 },
  { date: "2024-04-28", bsit: 122, bscs: 180, bsins: 75 },
  { date: "2024-04-29", bsit: 315, bscs: 240, bsins: 135 },
  { date: "2024-04-30", bsit: 454, bscs: 380, bsins: 205 },
  { date: "2024-05-01", bsit: 165, bscs: 220, bsins: 95 },
  { date: "2024-05-02", bsit: 293, bscs: 310, bsins: 140 },
  { date: "2024-05-03", bsit: 247, bscs: 190, bsins: 110 },
  { date: "2024-05-04", bsit: 385, bscs: 420, bsins: 185 },
  { date: "2024-05-05", bsit: 481, bscs: 390, bsins: 210 },
  { date: "2024-05-06", bsit: 498, bscs: 520, bsins: 230 },
  { date: "2024-05-07", bsit: 388, bscs: 300, bsins: 170 },
  { date: "2024-05-08", bsit: 149, bscs: 210, bsins: 85 },
  { date: "2024-05-09", bsit: 227, bscs: 180, bsins: 110 },
  { date: "2024-05-10", bsit: 293, bscs: 330, bsins: 145 },
  { date: "2024-05-11", bsit: 335, bscs: 270, bsins: 150 },
  { date: "2024-05-12", bsit: 197, bscs: 240, bsins: 105 },
  { date: "2024-05-13", bsit: 197, bscs: 160, bsins: 95 },
  { date: "2024-05-14", bsit: 448, bscs: 490, bsins: 220 },
  { date: "2024-05-15", bsit: 473, bscs: 380, bsins: 215 },
  { date: "2024-05-16", bsit: 338, bscs: 400, bsins: 175 },
  { date: "2024-05-17", bsit: 499, bscs: 420, bsins: 225 },
  { date: "2024-05-18", bsit: 315, bscs: 350, bsins: 160 },
  { date: "2024-05-19", bsit: 235, bscs: 180, bsins: 115 },
  { date: "2024-05-20", bsit: 177, bscs: 230, bsins: 95 },
  { date: "2024-05-21", bsit: 82, bscs: 140, bsins: 55 },
  { date: "2024-05-22", bsit: 81, bscs: 120, bsins: 50 },
  { date: "2024-05-23", bsit: 252, bscs: 290, bsins: 130 },
  { date: "2024-05-24", bsit: 294, bscs: 220, bsins: 140 },
  { date: "2024-05-25", bsit: 201, bscs: 250, bsins: 110 },
  { date: "2024-05-26", bsit: 213, bscs: 170, bsins: 105 },
  { date: "2024-05-27", bsit: 420, bscs: 460, bsins: 210 },
  { date: "2024-05-28", bsit: 233, bscs: 190, bsins: 115 },
  { date: "2024-05-29", bsit: 78, bscs: 130, bsins: 50 },
  { date: "2024-05-30", bsit: 340, bscs: 280, bsins: 160 },
  { date: "2024-05-31", bsit: 178, bscs: 230, bsins: 95 },
  { date: "2024-06-01", bsit: 178, bscs: 200, bsins: 95 },
  { date: "2024-06-02", bsit: 470, bscs: 410, bsins: 225 },
  { date: "2024-06-03", bsit: 103, bscs: 160, bsins: 65 },
  { date: "2024-06-04", bsit: 439, bscs: 380, bsins: 210 },
  { date: "2024-06-05", bsit: 88, bscs: 140, bsins: 55 },
  { date: "2024-06-06", bsit: 294, bscs: 250, bsins: 145 },
  { date: "2024-06-07", bsit: 323, bscs: 370, bsins: 165 },
  { date: "2024-06-08", bsit: 385, bscs: 320, bsins: 185 },
  { date: "2024-06-09", bsit: 438, bscs: 480, bsins: 220 },
  { date: "2024-06-10", bsit: 155, bscs: 200, bsins: 90 },
  { date: "2024-06-11", bsit: 92, bscs: 150, bsins: 60 },
  { date: "2024-06-12", bsit: 492, bscs: 420, bsins: 230 },
  { date: "2024-06-13", bsit: 81, bscs: 130, bsins: 50 },
  { date: "2024-06-14", bsit: 426, bscs: 380, bsins: 205 },
  { date: "2024-06-15", bsit: 307, bscs: 350, bsins: 155 },
  { date: "2024-06-16", bsit: 371, bscs: 310, bsins: 180 },
  { date: "2024-06-17", bsit: 475, bscs: 520, bsins: 240 },
  { date: "2024-06-18", bsit: 107, bscs: 170, bsins: 70 },
  { date: "2024-06-19", bsit: 341, bscs: 290, bsins: 160 },
  { date: "2024-06-20", bsit: 408, bscs: 450, bsins: 205 },
  { date: "2024-06-21", bsit: 169, bscs: 210, bsins: 95 },
  { date: "2024-06-22", bsit: 317, bscs: 270, bsins: 150 },
  { date: "2024-06-23", bsit: 480, bscs: 530, bsins: 245 },
  { date: "2024-06-24", bsit: 132, bscs: 180, bsins: 80 },
  { date: "2024-06-25", bsit: 141, bscs: 190, bsins: 85 },
  { date: "2024-06-26", bsit: 434, bscs: 380, bsins: 215 },
  { date: "2024-06-27", bsit: 448, bscs: 490, bsins: 230 },
  { date: "2024-06-28", bsit: 149, bscs: 200, bsins: 90 },
  { date: "2024-06-29", bsit: 103, bscs: 160, bsins: 65 },
  { date: "2024-06-30", bsit: 446, bscs: 400, bsins: 220 },
];

type CourseKey = "bsit" | "bscs" | "bsins";

const chartConfig = {
  views: {
    label: "Course Engagement",
  },
  bsit: {
    label: "BS Information Technology (BSIT)",
    color: "#087f8c",
  },
  bscs: {
    label: "BS Computer Science (BSCS)",
    color: "#176c59",
  },
  bsins: {
    label: "BS Information Systems (BSINS)",
    color: "#9c6016",
  },
} satisfies ChartConfig;

const COURSE_COLORS: Record<CourseKey, string> = {
  bsit: "#087f8c",
  bscs: "#176c59",
  bsins: "#9c6016",
};

export function AttendeesInsightsCard() {
  const [activeChart, setActiveChart] = React.useState<CourseKey>("bsit");

  const total = React.useMemo(
    () => ({
      bsit: chartData.reduce((acc, curr) => acc + curr.bsit, 0),
      bscs: chartData.reduce((acc, curr) => acc + curr.bscs, 0),
      bsins: chartData.reduce((acc, curr) => acc + curr.bsins, 0),
    }),
    []
  );

  return (
    <Card className="relative py-0 rounded-[12px] border-line bg-card shadow-2xs font-sans overflow-hidden">
      {/* Subtle top gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-cyan via-green to-amber opacity-60 z-20" />

      <CardHeader className="flex flex-col items-stretch border-b border-line p-0 sm:flex-row bg-linear-to-b from-canvas/40 via-card to-card">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-4">
          <CardTitle className="text-xl font-bold font-display text-ink tracking-tight">
            Course Participation Activity
          </CardTitle>
          <CardDescription className="text-xs text-muted font-sans mt-0.5">
            Daily student event check-ins and engagement across the 3 computing courses
          </CardDescription>
        </div>
        <div className="flex">
          {(["bsit", "bscs", "bsins"] as const).map((key) => {
            const chart = key;
            const isActive = activeChart === chart;
            const activeGradientClass =
              chart === "bsit"
                ? "data-[active=true]:bg-linear-to-b data-[active=true]:from-cyan-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-cyan"
                : chart === "bscs"
                ? "data-[active=true]:bg-linear-to-b data-[active=true]:from-green-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-green"
                : "data-[active=true]:bg-linear-to-b data-[active=true]:from-amber-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-amber";

            return (
              <button
                key={chart}
                type="button"
                data-active={isActive}
                className={cn(
                  "relative z-10 flex flex-1 flex-col justify-center gap-1 border-t border-line px-5 py-3 text-left even:border-l even:border-line sm:border-t-0 sm:border-l sm:px-6 sm:py-4 cursor-pointer transition-all duration-200",
                  activeGradientClass
                )}
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs font-semibold text-muted font-sans uppercase tracking-wider">
                  {chart.toUpperCase()}
                </span>
                <span className="text-base leading-none font-bold text-ink sm:text-2xl font-display">
                  {total[key].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-6 sm:p-6 bg-linear-to-b from-card via-card to-canvas/20">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <defs>
              {/* BSIT - Cyan Linear Gradient */}
              <linearGradient id="gradient-bsit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#087f8c" stopOpacity={1} />
                <stop offset="100%" stopColor="#087f8c" stopOpacity={0.25} />
              </linearGradient>

              {/* BSCS - Green Linear Gradient */}
              <linearGradient id="gradient-bscs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#176c59" stopOpacity={1} />
                <stop offset="100%" stopColor="#176c59" stopOpacity={0.25} />
              </linearGradient>

              {/* BSINS - Amber Linear Gradient */}
              <linearGradient id="gradient-bsins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9c6016" stopOpacity={1} />
                <stop offset="100%" stopColor="#9c6016" stopOpacity={0.25} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[170px] font-sans text-xs bg-card border-line shadow-md"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(String(value)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`url(#gradient-${activeChart})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

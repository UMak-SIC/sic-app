"use client";

import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AttendanceStatItem {
  status: "attended" | "pending" | "absent";
  count: number;
  fill: string;
}

const chartConfig = {
  attendees: {
    label: "Attendees",
  },
  attended: {
    label: "Attended",
    color: "#176c59", // Deep Teal / Emerald
  },
  pending: {
    label: "Pending",
    color: "#9c6016", // Amber
  },
  absent: {
    label: "Absent",
    color: "#a43d49", // Crimson / Red
  },
} satisfies ChartConfig;

interface AttendeesPieChartProps {
  data: AttendanceStatItem[];
  totalCount: number;
  className?: string;
}

export function AttendeesPieChart({
  data,
  totalCount,
  className,
}: AttendeesPieChartProps) {
  const id = "attendees-pie-interactive";
  const [activeStatus, setActiveStatus] = React.useState<string>(
    data[0]?.status || "attended"
  );

  const activeIndex = React.useMemo(() => {
    const idx = data.findIndex((item) => item.status === activeStatus);
    return idx >= 0 ? idx : 0;
  }, [data, activeStatus]);

  const activeItem = data[activeIndex] || data[0];

  const renderPieShape = React.useCallback(
    ({ index, outerRadius = 0, ...props }: PieSectorShapeProps) => {
      if (index === activeIndex) {
        return (
          <g>
            <Sector {...props} outerRadius={outerRadius + 6} />
            <Sector
              {...props}
              outerRadius={outerRadius + 14}
              innerRadius={outerRadius + 9}
            />
          </g>
        );
      }

      return <Sector {...props} outerRadius={outerRadius} />;
    },
    [activeIndex]
  );

  return (
    <Card
      data-chart={id}
      className={cn(
        "flex flex-col border border-line bg-card shadow-xs rounded-[12px]",
        className
      )}
    >
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
        <div className="grid gap-0.5">
          <CardTitle className="text-base font-bold font-sans text-ink">
            Attendance Outcome
          </CardTitle>
          <CardDescription className="text-xs text-muted">
            {totalCount} total entries in roster
          </CardDescription>
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus}>
          <SelectTrigger
            className="h-8 w-[130px] rounded-lg text-xs font-medium border-line pl-2.5"
            aria-label="Filter status segment"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl font-sans">
            {data.map((item) => {
              const config = chartConfig[item.status];
              return (
                <SelectItem
                  key={item.status}
                  value={item.status}
                  className="rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: config?.color,
                      }}
                    />
                    <span>{config?.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex flex-1 items-center justify-center pb-3 pt-1 px-5">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[210px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={52}
              strokeWidth={3}
              shape={renderPieShape}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const percentage = totalCount
                      ? Math.round(((activeItem?.count || 0) / totalCount) * 100)
                      : 0;
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-ink text-2xl font-bold font-sans"
                        >
                          {activeItem?.count ?? 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted text-[11px] font-sans"
                        >
                          {chartConfig[activeItem?.status]?.label} ({percentage}%)
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

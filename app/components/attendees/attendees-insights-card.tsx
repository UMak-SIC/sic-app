"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner, Warning } from "@phosphor-icons/react";
import { fetchCourseInsights, type CourseInsights } from "./attendee-directory";

/**
 * Course participation, read from the registry.
 *
 * This card used to be 91 days of invented numbers with one bar per course and no
 * connection to anything: three hardcoded courses, six-digit colours that ignored the
 * palette entirely, and totals that added up to nothing in the directory above it.
 *
 * `attendees.course` is free text, so the courses here are the ones actually stored.
 * A fixed BSIT/BSCS/BSINS list could not have been right even with real data: any
 * other value would have been invisible, and students whose course was never recorded
 * would have been counted under a course nobody wrote.
 */

/** Colours come from the chart tokens, which are redefined for the dark theme. */
const CHART_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * How many courses get a stat tile before the row becomes a wall of numbers.
 * The chart still shows every course; this is only about the summary above it.
 */
const MAX_TILES = 4;

/** An empty string is "nobody recorded a course", which is a real group of students. */
function courseLabel(course: string): string {
  return course.trim() === "" ? "Not recorded" : course;
}

function initials(course: string): string {
  const label = courseLabel(course);
  return label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function AttendeesInsightsCard() {
  const [data, setData] = React.useState<CourseInsights | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchCourseInsights(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "These figures could not be loaded. Try again."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const courses = data?.courses ?? [];
  const tiles = courses.slice(0, MAX_TILES);
  const overflow = courses.length - tiles.length;

  /**
   * One bar per course. Each course keeps its own colour across both charts, so the
   * tile and the bar for a course are recognisably the same thing.
   */
  const chartData = courses.map((row, index) => ({
    course: courseLabel(row.course),
    students: row.students,
    attendanceRate: row.attendanceRate,
    fill: CHART_TOKENS[index % CHART_TOKENS.length],
  }));

  return (
    <Card className="relative py-0 rounded-[12px] border-line bg-card shadow-2xs font-sans overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-cyan via-green to-amber opacity-60 z-20" />

      <CardHeader className="flex flex-col items-stretch border-b border-line p-0 bg-linear-to-b from-canvas/40 via-card to-card">
        <div className="flex flex-col gap-1 px-4 sm:px-6 pt-4 pb-3">
          <CardTitle className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
            Course Participation
          </CardTitle>
          <CardDescription className="text-xs text-muted font-sans mt-0.5">
            {data
              ? `${data.totals.students} students across ${data.totals.courseCount} ${
                  data.totals.courseCount === 1 ? "course" : "courses"
                }, and how often they turned up`
              : "How many students each course has, and how often they attended"}
          </CardDescription>
        </div>

        {/* One tile per course, from the courses actually on file. */}
        {isLoading ? (
          <div className="flex items-center gap-2 border-t border-line px-4 sm:px-6 py-4 text-xs text-muted" role="status">
            <Spinner size={16} className="animate-spin" aria-hidden />
            Loading participation…
          </div>
        ) : null}

        {!isLoading && tiles.length > 0 ? (
          <div className="flex flex-wrap gap-px border-t border-line bg-line">
            {tiles.map((row, index) => (
              <div key={row.course} className="flex-1 min-w-[120px] bg-card px-4 py-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_TOKENS[index % CHART_TOKENS.length] }}
                  />
                  {courseLabel(row.course)}
                </span>
                <span className="block text-xl font-bold font-display text-ink leading-tight">
                  {row.students.toLocaleString()}
                </span>
                <span className="block text-[11px] text-muted">
                  {row.attendanceRate}% attendance
                </span>
              </div>
            ))}

            {overflow > 0 ? (
              <div className="flex-1 min-w-[120px] bg-card px-4 py-3">
                <span className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                  More courses
                </span>
                <span className="block text-xl font-bold font-display text-ink leading-tight">
                  {overflow}
                </span>
                <span className="block text-[11px] text-muted">shown in the chart</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="px-2 pt-4 pb-6 sm:p-6 bg-linear-to-b from-card via-card to-canvas/20">
        {error ? (
          <p
            role="alert"
            className="m-2 flex items-start gap-2 rounded-[6px] border border-red-border bg-red-soft px-3 py-2.5 text-xs text-ink"
          >
            <Warning size={15} weight="bold" className="text-red shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        ) : null}

        {!error && !isLoading && courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs font-semibold text-ink">No students to summarise yet</p>
            <p className="text-[11px] text-muted mt-0.5">
              Add students or import a list, and this will fill in.
            </p>
          </div>
        ) : null}

        {courses.length > 0 ? (
          <ChartContainer
            className="aspect-auto h-[240px] w-full"
            config={{ students: { label: "Students" } }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 4, right: 12, top: 8 }}
            >
              <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
              <XAxis
                dataKey="course"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
                tickMargin={4}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="font-sans text-xs bg-card border-line shadow-md"
                    // Attendance is not here. It is a percentage of the same students
                    // and has no place on an axis counting heads, so it is listed
                    // explicitly below the chart instead of squeezed into a tooltip.
                    labelFormatter={(value) => String(value)}
                  />
                }
              />
              <Bar
                dataKey="students"
                radius={[4, 4, 0, 0]}
                // Per-course colour from the chart tokens, so a bar matches its tile.
                fill="var(--chart-1)"
              />
            </BarChart>
          </ChartContainer>
        ) : null}

        {/* Attendance rate as its own row, because it is a percentage and does not
            belong on the same axis as a headcount. */}
        {courses.length > 0 ? (
          <div className="mt-4 space-y-2 px-2 sm:px-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Attendance by course
            </p>
            <ul className="space-y-1.5">
              {courses.map((row, index) => (
                <li key={row.course} className="flex items-center gap-3">
                  <span className="w-32 sm:w-40 shrink-0 truncate text-[11px] text-ink">
                    {courseLabel(row.course)}
                  </span>
                  <span
                    aria-hidden
                    className="h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: CHART_TOKENS[index % CHART_TOKENS.length],
                      width: `${Math.max(row.attendanceRate, 2)}%`,
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-[11px] font-semibold text-ink shrink-0">
                    {row.attendanceRate}%
                  </span>
                  <span className="text-[11px] text-muted shrink-0">
                    {row.attendedCheckIns} of {row.rosterEntries}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
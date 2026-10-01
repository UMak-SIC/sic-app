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
import { canonicalCourseCode, compareCourses, isUnrecordedCourse } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { fetchCourseInsights, type CourseInsights } from "./attendee-directory";

/**
 * Course participation, per event.
 *
 * ## The axis is events, not days
 *
 * This chart used to plot one bar per day across three months of invented numbers,
 * which answered a question nobody had: how much activity was there on each of ninety
 * consecutive days. Activity does not happen per day here — it happens at events. So
 * each bar is an event, and each course's tab shows how many of its students were
 * marked present at each one.
 *
 * The card's shape, colours, gradients and chart settings are unchanged. Only the data
 * behind them is real, and what is on the horizontal axis changed to match the
 * question.
 */

export const description = "An interactive bar chart of course participation at each event";

/**
 * The three computing courses keep the colours they already had.
 *
 * These are the design tokens' own values: `--cyan`, `--green` and `--amber`. They are
 * written out because a recharts gradient stop needs a literal colour, and inlining a
 * token's value keeps the rendered chart identical to how it looked before. Any course
 * the registry holds that is not one of the three falls back to `--muted`, which is
 * deliberately dull: it is a data point nobody planned for, not a fourth brand colour.
 */
type CourseTheme = {
  /** The token this value comes from, for anyone reading the source later. */
  token: string;
  color: string;
  active: string;
};

const KNOWN: CourseTheme[] = [
  {
    token: "--cyan",
    color: "#087f8c",
    active:
      "data-[active=true]:bg-linear-to-b data-[active=true]:from-cyan-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-cyan",
  },
  {
    token: "--green",
    color: "#176c59",
    active:
      "data-[active=true]:bg-linear-to-b data-[active=true]:from-green-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-green",
  },
  {
    token: "--amber",
    color: "#9c6016",
    active:
      "data-[active=true]:bg-linear-to-b data-[active=true]:from-amber-soft/80 data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-amber",
  },
];

const FALLBACK: CourseTheme = {
  token: "--muted",
  color: "#607579",
  active:
    "data-[active=true]:bg-linear-to-b data-[active=true]:from-canvas data-[active=true]:to-card data-[active=true]:border-b-2 data-[active=true]:border-b-muted",
};

/**
 * The colour for a course, chosen by the code it belongs to rather than by its exact
 * spelling, so "BS-IT" is drawn as BSIT and not as an unrecognised course.
 */
function themeFor(course: string): CourseTheme {
  if (isUnrecordedCourse(course)) return FALLBACK;

  const code = canonicalCourseCode(course);
  if (!code) return FALLBACK;

  return KNOWN[code === "BSIT" ? 0 : code === "BSCS" ? 1 : 2];
}

/** The registry stores an empty string for a student with no course recorded. */
function courseLabel(course: string): string {
  return isUnrecordedCourse(course) ? "Not recorded" : course;
}

const chartConfig = {
  views: {
    label: "Students marked present",
  },
} satisfies ChartConfig;

// Stable identities for the "nothing loaded yet" case. A fresh `[]` on every render
// would be a new dependency each time and defeat the memo below.
const NO_EVENTS: { id: string; name: string; startsAt: string; counts: Record<string, number> }[] = [];
const NO_COURSES: string[] = [];
const NO_TOTALS: Record<string, number> = {};

/**
 * Turns the insights payload into the shape the chart draws.
 *
 * The tab figures are the course's own `attendedCheckIns`, which is already the
 * number of that course's students marked present across every event. Recomputing it
 * from the per-event counts here would be the same total by a longer route, and the
 * service's figure is the one the tests pin.
 */
function toChartModel(data: CourseInsights) {
  const courses = data.courses.map((row) => row.course);

  const totals: Record<string, number> = {};
  for (const row of data.courses) {
    totals[row.course] = row.attendedCheckIns;
  }

  return { courses, totals, events: data.events, timezone: data.timezone };
}

/** Event names are long; the axis gets a short one and the tooltip the whole thing. */
function shorten(name: string): string {
  return name.length <= 18 ? name : `${name.slice(0, 17)}…`;
}

/**
 * Pulls the row recharts is pointing at out of the tooltip payload.
 *
 * The payload is typed as `unknown[]` by the chart primitive, and the row is nested
 * under a `payload` key. Narrowing it here rather than with a cast keeps the one
 * genuinely uncertain shape in the file in one place.
 */
function rowFromPayload(payload: unknown[]): Record<string, unknown> | undefined {
  const first = payload[0];

  if (typeof first !== "object" || first === null || !("payload" in first)) {
    return undefined;
  }

  const row = (first as { payload?: unknown }).payload;

  return typeof row === "object" && row !== null ? (row as Record<string, unknown>) : undefined;
}

export function AttendeesInsightsCard() {
  const [insights, setInsights] = React.useState<CourseInsights | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [chosenCourse, setChosenCourse] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchCourseInsights(controller.signal)
      .then((result) => {
        if (!active) return;
        setInsights(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        // An aborted request is one that was superseded, not a failure to report.
        if (!active || (caught instanceof DOMException && caught.name === "AbortError")) return;

        setInsights(null);
        setError(
          caught instanceof Error
            ? caught.message
            : "The participation figures could not be loaded. Try again."
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const model = React.useMemo(() => (insights ? toChartModel(insights) : null), [insights]);

  const courses = model?.courses ?? NO_COURSES;
  const events = model?.events ?? NO_EVENTS;

  // Falls back to the first course when the chosen one is not in this result, so a
  // reload with different data cannot leave the chart showing nothing.
  const activeCourse =
    chosenCourse && courses.includes(chosenCourse) ? chosenCourse : (courses[0] ?? null);

  const activeIndex = activeCourse ? courses.indexOf(activeCourse) : 0;

  const rows = React.useMemo(
    () =>
      events.map((event) => {
        const row: Record<string, string | number> = {
          event: shorten(event.name),
          fullName: event.name,
        };

        for (const course of courses) {
          row[course] = event.counts[course] ?? 0;
        }

        return row;
      }),
    [events, courses]
  );

  const totals = model?.totals ?? NO_TOTALS;

  const card = (body: React.ReactNode) => (
    <Card className="relative py-0 rounded-[12px] border-line bg-card shadow-2xs font-sans overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-cyan via-green to-amber opacity-60 z-20" />
      {body}
    </Card>
  );

  if (error) {
    return card(
      <CardContent className="px-4 py-6 sm:px-6 bg-linear-to-b from-card via-card to-canvas/20">
        <p role="alert" className="text-xs text-ink leading-relaxed">
          {error}
        </p>
      </CardContent>
    );
  }

  if (!insights) {
    // Shaped like the finished card so the page does not jump when the figures land.
    return card(
      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6" role="status" aria-live="polite">
        <div className="h-6 w-56 rounded-[6px] bg-canvas" />
        <div className="h-3 w-80 max-w-full rounded-[6px] bg-canvas/70" />
        <div className="h-[250px] w-full rounded-[9px] bg-canvas/50" />
        <span className="sr-only">Loading course participation…</span>
      </div>
    );
  }

  if (events.length === 0) {
    return card(
      <>
        <CardHeader className="flex flex-col items-stretch border-b border-line p-0 sm:flex-row bg-linear-to-b from-canvas/40 via-card to-card">
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 sm:px-6 py-4">
            <CardTitle className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              Course Participation Activity
            </CardTitle>
            <CardDescription className="text-xs text-muted font-sans mt-0.5">
              How many students from each course were marked present at each event
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-10 sm:px-6 bg-linear-to-b from-card via-card to-canvas/20">
          <p className="text-xs text-muted text-center leading-relaxed">
            No event has anybody on its list yet. Add students to an event and their
            attendance will be counted here.
          </p>
        </CardContent>
      </>
    );
  }

  return (
    <Card className="relative py-0 rounded-[12px] border-line bg-card shadow-2xs font-sans overflow-hidden">
      {/* Subtle top gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-cyan via-green to-amber opacity-60 z-20" />

      <CardHeader className="flex flex-col items-stretch border-b border-line p-0 sm:flex-row bg-linear-to-b from-canvas/40 via-card to-card">
        <div className="flex flex-1 flex-col justify-center gap-1 px-4 sm:px-6 pt-4 pb-3 sm:py-4">
          <CardTitle className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
            Course Participation Activity
          </CardTitle>
          <CardDescription className="text-xs text-muted font-sans mt-0.5">
            How many students from each course were marked present at each event
          </CardDescription>
        </div>
        <div className="flex divide-x divide-line border-t sm:border-t-0 border-line">
          {courses.map((course) => {
            const isActive = course === activeCourse;

            return (
              <button
                key={course}
                type="button"
                data-active={isActive}
                aria-pressed={isActive}
                className={cn(
                  "relative z-10 flex flex-1 flex-col justify-center gap-1 px-3 sm:px-6 py-2.5 sm:py-4 text-left sm:border-l sm:border-line cursor-pointer transition-all duration-200",
                  themeFor(course).active
                )}
                onClick={() => setChosenCourse(course)}
              >
                <span className="text-[10px] sm:text-xs font-semibold text-muted font-sans uppercase tracking-wider">
                  {courseLabel(course)}
                </span>
                <span className="text-sm leading-none font-bold text-ink sm:text-2xl font-display">
                  {(totals[course] ?? 0).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-6 sm:p-6 bg-linear-to-b from-card via-card to-canvas/20">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={rows}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <defs>
              {/* One gradient per course on show, in the same vertical fade as before. */}
              {courses.map((course, index) => (
                <linearGradient
                  key={course}
                  id={`gradient-participation-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={themeFor(course).color} stopOpacity={1} />
                  <stop offset="100%" stopColor={themeFor(course).color} stopOpacity={0.25} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
            <XAxis
              dataKey="event"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[170px] font-sans text-xs bg-card border-line shadow-md"
                  nameKey="views"
                  // The axis shows a shortened name; the tooltip shows the event in
                  // full with its date, which is what somebody checking a figure needs.
                  labelFormatter={(_label, payload) => {
                    const fullName = rowFromPayload(payload)?.fullName;
                    if (typeof fullName !== "string") return "";

                    const event = events.find((entry) => entry.name === fullName);
                    if (!event) return fullName;

                    const date = new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: model?.timezone,
                    }).format(new Date(event.startsAt));

                    return `${event.name} · ${date}`;
                  }}
                />
              }
            />
            <Bar
              dataKey={activeCourse ?? ""}
              fill={`url(#gradient-participation-${activeIndex})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
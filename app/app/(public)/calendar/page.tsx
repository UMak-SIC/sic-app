import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, focusRing, PageBody, PageHeader } from "@/components/public/page-parts";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import {
  buildMonthGrid,
  monthOf,
  monthParam,
  monthRange,
  parseMonthParam,
  shiftMonth,
  type MonthRef,
} from "@/lib/public-site/calendar";
import { listEventsStartingBetween } from "@/lib/public-site/events";
import { formatEventDate, formatEventTime } from "@/lib/public-site/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthTitle({ year, month }: MonthRef): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

// A month of published events (PS-04): previous and next month, today marked, a
// grid on wider screens and a list on narrow ones. Drafts never appear.
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const now = new Date();
  const timeZone = getOrganizationTimezone();
  const { month } = await searchParams;
  const ref = parseMonthParam(Array.isArray(month) ? month[0] : month, monthOf(now, timeZone));
  const { start, end } = monthRange(ref, timeZone);
  const events = await listEventsStartingBetween(start, end);
  const weeks = buildMonthGrid(ref, events, timeZone, now);
  const daysWithEvents = weeks.flat().filter((day) => day.inMonth && day.events.length > 0);
  const title = monthTitle(ref);

  const navLink = cn(
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted",
    focusRing,
  );

  return (
    <PageBody>
      <PageHeader title="Calendar" intro="Every SIC event, month by month. Select an event for its details." />

      <section aria-labelledby="month-title" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="month-title" className="font-display text-2xl font-bold tracking-tight" aria-live="polite">
            {title}
          </h2>
          <nav aria-label="Change month" className="flex gap-2">
            <Link href={`/calendar?month=${monthParam(shiftMonth(ref, -1))}`} className={navLink}>
              <CaretLeft size={16} aria-hidden="true" />
              Previous<span className="sr-only"> month</span>
            </Link>
            <Link href={`/calendar?month=${monthParam(shiftMonth(ref, 1))}`} className={navLink}>
              Next<span className="sr-only"> month</span>
              <CaretRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>

        {/* Grid on wider screens. */}
        <div className="hidden overflow-hidden rounded-[16px] border border-line bg-paper sm:block">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Events in {title}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col" className="border-b border-line bg-canvas py-2 text-xs font-semibold text-muted">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0].key}>
                  {week.map((day) => (
                    <td
                      key={day.key}
                      aria-current={day.isToday ? "date" : undefined}
                      className={cn(
                        "h-28 border-b border-r border-line-subtle p-2 align-top last:border-r-0",
                        !day.inMonth && "bg-canvas/60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          day.isToday ? "bg-cyan font-bold text-paper" : day.inMonth ? "text-ink" : "text-muted-light",
                        )}
                      >
                        {day.dayOfMonth}
                        {day.isToday ? <span className="sr-only"> (today)</span> : null}
                      </span>
                      <ul className="mt-1 flex flex-col gap-1">
                        {day.events.map((event) => (
                          <li key={event.id}>
                            <Link
                              href={`/events/${event.id}`}
                              className={cn(
                                "block truncate rounded-[4px] bg-cyan-soft px-1.5 py-0.5 text-xs font-semibold text-cyan hover:bg-cyan-muted",
                                focusRing,
                              )}
                            >
                              {event.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* List on narrow screens (PS-04.3). */}
        <div className="sm:hidden">
          {daysWithEvents.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {daysWithEvents.flatMap((day) =>
                day.events.map((event) => {
                  const full = events.find((item) => item.id === event.id);
                  return (
                    <li key={event.id} className="relative rounded-[12px] border border-line bg-paper p-4">
                      <p className={cn("text-xs", day.isToday ? "font-bold text-cyan" : "text-muted")}>
                        {formatEventDate(event.startsAt, timeZone)}
                        {day.isToday ? " (today)" : ""}
                      </p>
                      <Link
                        href={`/events/${event.id}`}
                        className={cn("mt-1 block font-display text-base font-bold after:absolute after:inset-0 rounded-[4px]", focusRing)}
                      >
                        {event.name}
                      </Link>
                      {full ? (
                        <p className="mt-1 text-sm text-muted">{formatEventTime(full.startsAt, full.endsAt, timeZone)}</p>
                      ) : null}
                    </li>
                  );
                }),
              )}
            </ol>
          ) : (
            <EmptyState icon={CalendarBlank} message={`No events in ${title}.`} />
          )}
        </div>

        {events.length === 0 ? (
          <p className="hidden text-sm text-muted sm:block">No events in {title}.</p>
        ) : null}
      </section>
    </PageBody>
  );
}

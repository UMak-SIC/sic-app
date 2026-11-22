import type { Metadata } from "next";
import { CalendarBlank, ClockCounterClockwise, EnvelopeSimpleOpen } from "@phosphor-icons/react/dist/ssr";

import { PastEventCard, UpcomingEventCard } from "@/components/public/event-parts";
import { EmptyState, PageBody, PageHeader, Pager, pageFromParam, SectionTitle } from "@/components/public/page-parts";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { listPastEvents, listUpcomingEvents } from "@/lib/public-site/events";

export const metadata: Metadata = { title: "Events" };

const PAST_PAGE_SIZE = 9;

// Upcoming and past events (PS-05). Built from published events only; an event
// moves to Past once its end time has passed.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const now = new Date();
  const timeZone = getOrganizationTimezone();
  const page = pageFromParam((await searchParams).page);
  const [upcoming, past] = await Promise.all([
    listUpcomingEvents(now),
    listPastEvents(now, page, PAST_PAGE_SIZE),
  ]);
  const pageCount = Math.max(1, Math.ceil(past.total / PAST_PAGE_SIZE));

  return (
    <PageBody className="gap-14">
      <PageHeader title="Events" intro="Talks, workshops and gatherings for CCIS students." />

      <section aria-labelledby="upcoming" className="flex flex-col gap-5">
        <SectionTitle id="upcoming">Upcoming</SectionTitle>
        <div className="flex items-start gap-3 rounded-[12px] border border-cyan-border bg-cyan-muted p-4 text-sm leading-relaxed text-ink">
          <EnvelopeSimpleOpen size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
          <p>
            Invitations, each with a personal QR ticket, are sent by email to the students on an
            event&apos;s list. When an event has a registration form, use its Register button to sign up.
          </p>
        </div>
        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-4">
            {upcoming.map((event) => (
              <UpcomingEventCard key={event.id} event={event} timeZone={timeZone} />
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarBlank} message="No upcoming events yet. New events appear here as soon as they are announced." />
        )}
      </section>

      <section aria-labelledby="past" className="flex flex-col gap-5">
        <SectionTitle id="past">Past</SectionTitle>
        {past.events.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.events.map((event) => (
                <li key={event.id}>
                  <PastEventCard event={event} timeZone={timeZone} />
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              pageCount={pageCount}
              hrefFor={(target) => `/events?page=${target}#past`}
              label="Past events pages"
            />
          </>
        ) : (
          <EmptyState icon={ClockCounterClockwise} message="No past events yet." />
        )}
      </section>
    </PageBody>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarBlank, PencilSimple, Plus, PaperPlaneTilt, UsersThree } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EventStatusBadge, type EventStatus } from "@/components/events/event-status-badge";
import { EventFormDialog, type EditableEvent } from "@/components/events/event-form-dialog";
import { EventPeopleDialog } from "@/components/events/event-people-dialog";

type Event = EditableEvent & { status: "DRAFT" | "PUBLISHED" | "CLOSED" };

function statusFor(event: Event): EventStatus {
  return event.status.toLowerCase() as EventStatus;
}

export default function EventsPage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [timezone, setTimezone] = React.useState("the organization timezone");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<EditableEvent | undefined>();
  const [formOpen, setFormOpen] = React.useState(false);
  const [managingPeople, setManagingPeople] = React.useState<Event | null>(null);

  const loadEvents = React.useEffectEvent(async () => {
    setLoading(true);
    const response = await fetch("/api/events");
    if (!response.ok) {
      setError("Events could not be loaded. Refresh the page and try again.");
      setLoading(false);
      return;
    }
    const data = await response.json();
    setEvents(data.events);
    setTimezone(data.timezone);
    setError("");
    setLoading(false);
  });

  React.useEffect(() => { void Promise.resolve().then(loadEvents); }, []);

  function displayDate(value: string) {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <PageHeader
        title={<span className="font-display">Manage <span className="font-bold">events</span></span>}
        description={`All event times use ${timezone}.`}
        action={<PageHeaderButton icon={<Plus size={18} weight="bold" />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>Create event</PageHeaderButton>}
      />
      {error && <p role="alert" className="rounded-[6px] bg-red-soft px-4 py-3 text-sm text-red">{error}</p>}
      {loading ? <div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted">Loading events...</div> : events.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line bg-card p-10 text-center">
          <CalendarBlank size={24} weight="regular" className="mx-auto text-cyan" />
          <h2 className="mt-3 font-display text-xl font-bold text-ink">No events yet</h2>
          <p className="mt-1 text-sm text-muted">Create an event to save its schedule and prepare attendance.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-card">
          {events.map((event) => (
            <article key={event.id} className="flex flex-col gap-3 border-b border-line-subtle p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-ink">{event.name}</h2><EventStatusBadge status={statusFor(event)} /></div>
                <p className="mt-1 text-sm text-muted">{displayDate(event.startsAt)} to {displayDate(event.endsAt)}</p>
                <p className="mt-2 max-w-3xl text-sm text-ink">{event.details}</p>
              </div>
               <div className="flex shrink-0 gap-2">
                 <Button asChild variant="outline" className="rounded-[6px]"><Link href={`/events/${event.id}`}>View event</Link></Button>
                 <Button variant="outline" className="rounded-[6px]" onClick={() => setManagingPeople(event)}><UsersThree size={18} weight="bold" /> People</Button>
                 <Button asChild className="rounded-[6px] bg-cyan text-white hover:bg-cyan-hover"><Link href={`/campaign/new?eventId=${event.id}`}><PaperPlaneTilt size={18} weight="bold" /> Compose email</Link></Button>
                 {event.status === "DRAFT" && <Button variant="outline" className="rounded-[6px]" onClick={() => { setEditing(event); setFormOpen(true); }}><PencilSimple size={18} weight="bold" /> Edit</Button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} timezone={timezone} onSaved={loadEvents} />
      {managingPeople && <EventPeopleDialog eventId={managingPeople.id} eventName={managingPeople.name} open onOpenChange={(open) => { if (!open) setManagingPeople(null); }} />}
    </div>
  );
}

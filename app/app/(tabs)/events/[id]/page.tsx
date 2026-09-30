"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarBlank, PencilSimple, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EventStatusBadge, type EventStatus } from "@/components/events/event-status-badge";
import { EventFormDialog, type EditableEvent } from "@/components/events/event-form-dialog";

type Event = EditableEvent & {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  imageAsset: { originalFilename: string } | null;
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = React.useState<Event | null>(null);
  const [timezone, setTimezone] = React.useState("the organization timezone");
  const [error, setError] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const loadEvent = React.useEffectEvent(async () => {
    const response = await fetch(`/api/events/${params.id}`);
    if (!response.ok) {
      setError(response.status === 404 ? "This event could not be found." : "This event could not be loaded.");
      return;
    }
    const data = await response.json();
    setEvent(data.event);
    setTimezone(data.timezone);
  });

  React.useEffect(() => { void Promise.resolve().then(loadEvent); }, [params.id]);

  async function publish() {
    setPublishing(true);
    const response = await fetch(`/api/events/${params.id}/publish`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "The event could not be published.");
    else await loadEvent();
    setPublishing(false);
  }

  if (error && !event) return <p role="alert" className="rounded-[6px] bg-red-soft px-4 py-3 text-sm text-red">{error}</p>;
  if (!event) return <div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted">Loading event...</div>;

  const format = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(value));
  const status = event.status.toLowerCase() as EventStatus;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-[6px] text-ink"><Link href="/events"><ArrowLeft size={18} /> All events</Link></Button>
      {error && <p role="alert" className="rounded-[6px] bg-red-soft px-4 py-3 text-sm text-red">{error}</p>}
      <section className="rounded-[16px] border border-line bg-card p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
          <div className="flex flex-wrap items-center gap-2"><EventStatusBadge status={status} /><span className="text-sm text-muted">{event.imageAsset ? `Banner: ${event.imageAsset.originalFilename}` : "No banner selected"}</span></div>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">{event.name}</h1>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted">{event.details}</p>
          </div>
          {event.status === "DRAFT" && <div className="flex h-fit flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)} className="rounded-[6px]"><PencilSimple size={18} weight="bold" /> Edit</Button>
            <Button disabled={publishing} onClick={publish} className="rounded-[6px] bg-cyan text-white hover:bg-cyan-hover"><PaperPlaneTilt size={18} weight="bold" /> Publish</Button>
          </div>}
        </div>
        <div className="mt-6 grid gap-3 border-t border-line-subtle pt-5 sm:grid-cols-2">
          <div className="flex gap-3"><CalendarBlank size={20} className="shrink-0 text-cyan" /><div><p className="text-xs font-semibold text-muted">Starts</p><p className="text-sm text-ink">{format(event.startsAt)}</p></div></div>
          <div className="flex gap-3"><CalendarBlank size={20} className="shrink-0 text-cyan" /><div><p className="text-xs font-semibold text-muted">Ends</p><p className="text-sm text-ink">{format(event.endsAt)}</p></div></div>
        </div>
      </section>
      <p className="text-xs text-muted">Times are shown in {timezone}.</p>
      <EventFormDialog open={editing} onOpenChange={setEditing} event={event} timezone={timezone} onSaved={loadEvent} />
    </div>
  );
}

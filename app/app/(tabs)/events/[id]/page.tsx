"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  MapPin,
  PaperPlaneTilt,
  PencilSimple,
  QrCode,
  UsersThree,
} from "@phosphor-icons/react";
import { KpiCardRow, type KpiItem } from "@/components/campaign/campaign-kpi-row";
import { LiveCheckinDialog } from "@/components/checkin/live-checkin-dialog";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";
import { EventFormDialog, type EditableEvent } from "@/components/events/event-form-dialog";
import { EventPeopleDialog } from "@/components/events/event-people-dialog";
import { EventPeopleTab } from "@/components/events/event-people-tab";
import { EventStatusBadge, type EventStatus } from "@/components/events/event-status-badge";
import { Button } from "@/components/ui/button";

type Event = EditableEvent & {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  imageAsset: { originalFilename: string; objectKey: string; storageBucket: string | null } | null;
  bannerUrl: string | null;
  _count: { rosterEntries: number };
};

function formatDuration(startsAt: string, endsAt: string) {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = React.useState<Event | null>(null);
  const [timezone, setTimezone] = React.useState("the organization timezone");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [managingPeople, setManagingPeople] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const loadEvent = React.useEffectEvent(async () => {
    const response = await fetch(`/api/events/${params.id}`);
    if (!response.ok) {
      setError(response.status === 404 ? "This event could not be found." : "This event could not be loaded.");
      return;
    }
    const data = await response.json();
    setEvent(data.event);
    setTimezone(data.timezone);
    setError("");
  });

  React.useEffect(() => { void Promise.resolve().then(loadEvent); }, [params.id]);

  async function publish() {
    setPublishing(true);
    setNotice("");
    const response = await fetch(`/api/events/${params.id}/publish`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "The event could not be published.");
    else {
      setNotice("Event published successfully.");
      await loadEvent();
    }
    setPublishing(false);
  }

  if (error && !event) return <p role="alert" className="rounded-[6px] bg-red-soft px-4 py-3 text-sm text-red">{error}</p>;
  if (!event) return <EventDetailSkeleton />;

  const formatShortDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: timezone }).format(new Date(value));
  const formatTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: timezone }).format(new Date(value));
  const status = event.status.toLowerCase() as EventStatus;
  const selectedPeople = event._count.rosterEntries;
  const duration = formatDuration(event.startsAt, event.endsAt);
  const kpiItems: KpiItem[] = [
    {
      label: "Selected People",
      icon: <UsersThree size={18} weight="bold" />,
      color: "var(--cyan)",
      format: (value) => `${Math.round(value)}`,
      delta: selectedPeople === 1 ? "1 person" : `${selectedPeople} people`,
      data: [0, selectedPeople],
    },
    {
      label: "Event Length",
      icon: <Clock size={18} weight="bold" />,
      color: "var(--amber)",
      format: () => duration,
      delta: "Scheduled time",
      data: [0, Math.max(1, Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60_000))],
    },
    {
      label: "Event Status",
      icon: <CheckCircle size={18} weight="bold" />,
      color: status === "published" ? "var(--green)" : status === "draft" ? "var(--amber)" : "var(--muted)",
      format: () => status.charAt(0).toUpperCase() + status.slice(1),
      delta: status === "published" ? "Ready for attendees" : status === "draft" ? "Not published" : "No longer active",
      data: [0, 1],
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pt-6 pb-16 font-sans">
      <section className="overflow-hidden rounded-[16px] border border-line bg-card shadow-xs">
        <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-ink p-4 sm:h-64 sm:min-h-0 sm:p-6">
          {event.bannerUrl && <>
            {/* The dynamic storage URL cannot be configured for Next image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/55 to-ink/20" aria-hidden="true" />
          </>}
          {!event.bannerUrl && <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-cyan/35" aria-hidden="true" />}

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={status} />
              <span className="rounded-full border border-paper/15 bg-ink/65 px-3 py-1 text-xs font-semibold text-paper backdrop-blur">
                <UsersThree size={14} className="mr-1.5 inline text-cyan" aria-hidden="true" />
                {selectedPeople} {selectedPeople === 1 ? "person" : "people"} selected
              </span>
            </div>
            <button type="button" onClick={() => router.push("/events")} className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] bg-ink/55 px-2.5 py-1.5 text-xs font-semibold text-paper backdrop-blur transition-colors hover:bg-ink/80">
              <ArrowLeft size={13} weight="bold" aria-hidden="true" />
              <span>All Events</span>
            </button>
          </div>

          <div className="relative max-w-4xl pt-8">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-paper drop-shadow-sm sm:text-3xl lg:text-4xl">{event.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-paper/90 sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} weight="bold" className="shrink-0 text-cyan" aria-hidden="true" />{event.venue ?? "Online event"}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarBlank size={15} weight="bold" className="shrink-0 text-cyan" aria-hidden="true" />{formatShortDate(event.startsAt)} · {formatTime(event.startsAt)} to {formatTime(event.endsAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted">Times are shown in {timezone}.</p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {event.status === "PUBLISHED" && <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="h-9 cursor-pointer gap-1.5 rounded-[6px] border-line px-3.5 text-xs font-semibold hover:bg-canvas">
              <QrCode size={15} weight="bold" aria-hidden="true" />
              <span>Launch Scanner</span>
            </Button>}
            <Button type="button" variant="outline" onClick={() => setManagingPeople(true)} className="h-9 cursor-pointer gap-1.5 rounded-[6px] border-line px-3.5 text-xs font-semibold hover:bg-canvas">
              <UsersThree size={15} aria-hidden="true" />
              <span>Manage People</span>
            </Button>
            <Button asChild className="h-9 cursor-pointer gap-1.5 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover">
              <Link href={`/campaign/new?eventId=${event.id}`}><PaperPlaneTilt size={15} weight="bold" aria-hidden="true" />Compose Email</Link>
            </Button>
            {event.status === "DRAFT" && <>
              <Button type="button" variant="outline" onClick={() => setEditing(true)} className="h-9 cursor-pointer gap-1.5 rounded-[6px] border-line px-3.5 text-xs font-semibold hover:bg-canvas">
                <PencilSimple size={15} aria-hidden="true" />
                <span>Edit</span>
              </Button>
              <Button type="button" onClick={() => void publish()} disabled={publishing} className="h-9 cursor-pointer gap-1.5 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover">
                <PaperPlaneTilt size={14} weight="bold" aria-hidden="true" />
                <span>{publishing ? "Publishing..." : "Publish"}</span>
              </Button>
            </>}
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-[9px] border border-red-border bg-red-soft p-3.5 text-xs font-medium text-red">{error}</p>}
      {notice && <div className="flex items-center justify-between rounded-[9px] border border-green-border bg-green-soft p-3.5 text-xs font-medium text-green"><span className="flex items-center gap-2"><CheckCircle size={16} weight="bold" aria-hidden="true" />{notice}</span><button type="button" onClick={() => setNotice("")} className="cursor-pointer font-bold hover:underline">Dismiss</button></div>}

      <KpiCardRow items={kpiItems} />

      <EventPeopleTab eventId={event.id} />

      <EventFormDialog open={editing} onOpenChange={setEditing} event={event} timezone={timezone} onSaved={loadEvent} />
      <EventPeopleDialog eventId={event.id} eventName={event.name} open={managingPeople} onOpenChange={setManagingPeople} />
      <LiveCheckinDialog open={scannerOpen} onOpenChange={setScannerOpen} eventId={event.id} eventName={event.name} totalAttended={0} totalRegistered={selectedPeople} />
    </div>
  );
}

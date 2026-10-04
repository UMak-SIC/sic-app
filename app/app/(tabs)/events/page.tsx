"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { EventsPagination } from "@/components/events/events-pagination";
import { EventsTable, type EventItem } from "@/components/events/events-table";
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton";
import { EventsToolbar } from "@/components/events/events-toolbar";
import { EventFormDialog, type EditableEvent } from "@/components/events/event-form-dialog";
import { EventPeopleDialog } from "@/components/events/event-people-dialog";

type Event = EditableEvent & {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  bannerUrl?: string | null;
  _count: { rosterEntries: number };
};

const PAGE_SIZE = 10;

function toTableEvent(event: Event, timezone: string): EventItem {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: timezone });
  const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: timezone });

  return {
    id: event.id,
    title: event.name,
    venue: event.venue ?? "Online event",
    date: dateFormat.format(start),
    time: `${timeFormat.format(start)} - ${timeFormat.format(end)}`,
    status: event.status.toLowerCase() as EventItem["status"],
    registeredCount: event._count.rosterEntries,
    image: event.bannerUrl ?? undefined,
  };
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [timezone, setTimezone] = React.useState("the organization timezone");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<EditableEvent | undefined>();
  const [formOpen, setFormOpen] = React.useState(false);
  const [managingPeople, setManagingPeople] = React.useState<Event | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const deferredQuery = React.useDeferredValue(query);

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

  const filteredEvents = events.filter((event) => {
    const matchesQuery = [event.name, event.venue ?? "", event.details]
      .some((value) => value.toLowerCase().includes(deferredQuery.trim().toLowerCase()));
    return matchesQuery && (statusFilter === "all" || event.status.toLowerCase() === statusFilter);
  });
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tableEvents = pageEvents.map((event) => toTableEvent(event, timezone));

  function toggleSelection(id: string) {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]);
  }

  function toggleAllSelection() {
    const pageIds = tableEvents.map((event) => event.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((ids) => allSelected ? ids.filter((id) => !pageIds.includes(id)) : [...new Set([...ids, ...pageIds])]);
  }

  function exportEvents() {
    const targetEvents = selectedIds.length > 0 ? filteredEvents.filter((event) => selectedIds.includes(event.id)) : filteredEvents;
    const rows = targetEvents.map((event) => {
      const item = toTableEvent(event, timezone);
      return [item.title, item.venue, item.date, item.time, item.status, item.registeredCount]
        .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",");
    });
    const blob = new Blob([["Event,Venue,Date,Time,Status,People", ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "umak-sic-events.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <PageHeader
        title={<span className="font-display">Want to create an <span className="font-bold">event?</span></span>}
        description="Search every draft, published, and closed event."
        action={<PageHeaderButton icon={<Plus size={18} weight="bold" />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>Create event</PageHeaderButton>}
      />
      {error && <p role="alert" className="rounded-[6px] bg-red-soft px-4 py-3 text-sm text-red">{error}</p>}
      {loading ? <EventsTableSkeleton /> : (
        <div className="flex flex-col gap-3.5">
          <EventsToolbar
            searchQuery={query}
            onSearchChange={(value) => { setQuery(value); setPage(1); }}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => { setStatusFilter(value); setPage(1); }}
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            onExportSelected={exportEvents}
          />
          <EventsTable
            events={tableEvents}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onToggleSelectAll={toggleAllSelection}
            onViewClick={(item) => router.push(`/events/${item.id}`)}
            onPeopleClick={(item) => setManagingPeople(events.find((event) => event.id === item.id) ?? null)}
            onComposeClick={(item) => router.push(`/campaign/new?eventId=${item.id}`)}
            onEditClick={(item) => {
              const event = events.find((candidate) => candidate.id === item.id);
              if (event) {
                setEditing(event);
                setFormOpen(true);
              }
            }}
            onCheckInClick={(item) => router.push(`/events/${item.id}`)}
            onExportClick={exportEvents}
          />
          <EventsPagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredEvents.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} timezone={timezone} onSaved={loadEvents} />
      {managingPeople && <EventPeopleDialog eventId={managingPeople.id} eventName={managingPeople.name} open onOpenChange={(open) => { if (!open) setManagingPeople(null); }} />}
    </div>
  );
}

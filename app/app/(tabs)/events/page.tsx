"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { EventsToolbar } from "@/components/events/events-toolbar";
import { EventsTable, EventItem } from "@/components/events/events-table";
import { EventsPagination } from "@/components/events/events-pagination";
import { CreateEventDialog } from "@/components/events/create-event-dialog";

const INITIAL_EVENTS: EventItem[] = [
  {
    id: "evt_1",
    title: "UMak SIC General Assembly",
    venue: "Audio Visual Room",
    date: "17 Oct 2026",
    time: "2:00 PM - 4:00 PM",
    status: "published",
    registeredCount: 118,
    capacity: 150,
    attendedCount: 71,
    image: "/assets/events/event-ga.png",
    grad: "radial-gradient(120% 140% at 20% 10%, rgba(8,127,140,0.55), transparent 60%), linear-gradient(150deg, #12333a, var(--card))",
  },
  {
    id: "evt_2",
    title: "Intro to Cloud Computing",
    venue: "CCIS Lab 304",
    date: "23 Oct 2026",
    time: "1:00 PM - 3:30 PM",
    status: "published",
    registeredCount: 48,
    capacity: 60,
    image: "/assets/events/event-cloud.png",
    grad: "radial-gradient(120% 140% at 80% 15%, rgba(41,163,136,0.5), transparent 60%), linear-gradient(150deg, #102a24, var(--card))",
  },
  {
    id: "evt_3",
    title: "UI/UX Design Sprint",
    venue: "CCIS Multimedia Hall",
    date: "28 Oct 2026",
    time: "9:00 AM - 12:00 PM",
    status: "published",
    registeredCount: 72,
    capacity: 80,
    image: "/assets/events/event-design.png",
    grad: "radial-gradient(120% 140% at 30% 85%, rgba(217,141,43,0.5), transparent 60%), linear-gradient(150deg, #2b2010, var(--card))",
  },
  {
    id: "evt_4",
    title: "UMak Tech Summit 2026",
    venue: "Grand Auditorium",
    date: "05 Nov 2026",
    time: "8:00 AM - 5:00 PM",
    status: "draft",
    registeredCount: 0,
    capacity: 350,
    image: "/assets/events/event-summit.png",
    grad: "radial-gradient(120% 140% at 70% 80%, rgba(34,184,201,0.5), transparent 60%), linear-gradient(150deg, #132e34, var(--card))",
  },
  {
    id: "evt_5",
    title: "Cybersecurity Workshop",
    venue: "CCIS Lab 302",
    date: "12 Nov 2026",
    time: "2:00 PM - 5:00 PM",
    status: "draft",
    registeredCount: 0,
    capacity: 50,
    image: "/assets/events/event-cyber.png",
    grad: "radial-gradient(120% 140% at 20% 80%, rgba(164,61,73,0.5), transparent 60%), linear-gradient(150deg, #3d171c, var(--card))",
  },
  {
    id: "evt_6",
    title: "Hackathon Orientation",
    venue: "Audio Visual Room",
    date: "10 Sep 2026",
    time: "1:30 PM - 4:00 PM",
    status: "closed",
    registeredCount: 142,
    capacity: 150,
    attendedCount: 138,
    image: "/assets/events/event-hackathon.png",
    grad: "radial-gradient(120% 140% at 80% 20%, rgba(8,127,140,0.5), transparent 60%), linear-gradient(150deg, #12333a, var(--card))",
  },
  {
    id: "evt_7",
    title: "Student Leadership Induction",
    venue: "University Amphitheater",
    date: "28 Aug 2026",
    time: "8:30 AM - 11:30 AM",
    status: "closed",
    registeredCount: 95,
    capacity: 100,
    attendedCount: 91,
    image: "/assets/events/event-leadership.png",
    grad: "radial-gradient(120% 140% at 20% 20%, rgba(41,163,136,0.5), transparent 60%), linear-gradient(150deg, #133930, var(--card))",
  },
  {
    id: "evt_8",
    title: "Freshmen IT Kickoff",
    venue: "Grand Auditorium",
    date: "14 Aug 2026",
    time: "9:00 AM - 12:00 PM",
    status: "closed",
    registeredCount: 280,
    capacity: 300,
    attendedCount: 265,
    image: "/assets/events/event-freshmen.png",
    grad: "radial-gradient(120% 140% at 70% 30%, rgba(217,141,43,0.5), transparent 60%), linear-gradient(150deg, #3b2810, var(--card))",
  },
];

export default function EventsPage() {
  const router = useRouter();
  const [eventsList, setEventsList] = React.useState<EventItem[]>(INITIAL_EVENTS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const pageSize = 10;

  // Add newly created or draft event
  const handleCreateEvent = (newEvent: EventItem) => {
    setEventsList((prev) => [newEvent, ...prev]);
  };

  // Filter items
  const filteredEvents = React.useMemo(() => {
    return eventsList.filter((evt) => {
      const matchesSearch =
        searchQuery === "" ||
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.venue.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || evt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [eventsList, searchQuery, statusFilter]);

  // Reorder handler
  const handleReorder = (newFilteredEvents: EventItem[]) => {
    if (searchQuery === "" && statusFilter === "all") {
      setEventsList(newFilteredEvents);
    } else {
      // Map reordered items back to full list
      const reorderedIds = new Set(newFilteredEvents.map((e) => e.id));
      const remainingItems = eventsList.filter((e) => !reorderedIds.has(e.id));
      setEventsList([...newFilteredEvents, ...remainingItems]);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEvents.map((evt) => evt.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleExportSelected = () => {
    const targetEvents =
      selectedIds.length > 0
        ? filteredEvents.filter((e) => selectedIds.includes(e.id))
        : filteredEvents;

    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Title,Venue,Date,Time,Status,Attendance,Capacity"]
        .concat(
          targetEvents.map(
            (e) =>
              `"${e.title}","${e.venue}","${e.date}","${e.time}","${e.status}",${e.attendedCount || e.registeredCount},${e.capacity}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `umak-sic-events-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Top Header */}
      <PageHeader
        title={
          <span className="font-display">
            Want to create an <span className="font-bold">event?</span>
          </span>
        }
        description="Search every draft, published, and closed event."
        action={
          <PageHeaderButton
            icon={<Plus size={18} weight="bold" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Event
          </PageHeaderButton>
        }
      />

      {/* Main Events Cockpit */}
      <div className="flex flex-col gap-3.5">
        {/* Toolbar: Search, Status Filter, CSV Export */}
        <EventsToolbar
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
            setCurrentPage(1);
          }}
          selectedCount={selectedIds.length}
          onClearSelection={handleClearSelection}
          onExportSelected={handleExportSelected}
        />

        {/* Simplified High-Density Data Table */}
        <EventsTable
          events={filteredEvents}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onReorder={handleReorder}
          onCheckInClick={(evt) => {
            router.push(`/events/${evt.id}`);
          }}
          onViewClick={(evt) => {
            router.push(`/events/${evt.id}`);
          }}
          onExportClick={() => {
            handleExportSelected();
          }}
        />

        {/* Pagination */}
        <EventsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEvents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create Event Multi-Step Modal */}
      <CreateEventDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}

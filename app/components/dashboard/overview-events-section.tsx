"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MiniCalendar } from "./mini-calendar";
import { UpcomingEventsList } from "./upcoming-events-list";
import { StudentsRegisteredCard } from "./students-registered-card";
import {
  DashboardEvent,
  PersistedEvent,
  toDashboardEvent,
  toRegistrationBreakdown,
} from "./events-data";
import { LiveCheckinDialog } from "@/components/checkin/live-checkin-dialog";

const dateKeyFor = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthFor = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

export function OverviewEventsSection() {
  const router = useRouter();
  const [events, setEvents] = React.useState<DashboardEvent[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(dateKeyFor(new Date()));
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [filterMode, setFilterMode] = React.useState<"all" | "day">("all");
  const [registrationBreakdown, setRegistrationBreakdown] = React.useState<DashboardEvent["collegeBreakdown"]>([]);
  const [checkInEvent, setCheckInEvent] = React.useState<DashboardEvent | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = React.useState(false);

  const loadUpcomingEvents = React.useCallback(async () => {
    const response = await fetch("/api/events");
    if (!response.ok) return;

    const { events: persistedEvents, timezone } = await response.json() as {
      events: PersistedEvent[];
      timezone: string;
    };
    const upcomingEvents = persistedEvents
      .filter((event) => event.status === "PUBLISHED" && new Date(event.startsAt).getTime() > Date.now())
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
      .map((event) => toDashboardEvent(event, timezone));
    const firstEvent = upcomingEvents[0];

    setEvents(upcomingEvents);
    if (firstEvent) {
      setSelectedEventId(firstEvent.id);
      setSelectedDate(firstEvent.dateKey);
      setMonth(monthFor(firstEvent.dateKey));
    }
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(loadUpcomingEvents);
  }, [loadUpcomingEvents]);

  const loadRegistrationBreakdown = React.useCallback(async () => {
    if (!selectedEventId) {
      setRegistrationBreakdown([]);
      return;
    }

    setRegistrationBreakdown([]);
    const response = await fetch(`/api/events/${selectedEventId}/registration-breakdown`);
    if (!response.ok) return;

    const { registrations } = await response.json();
    setRegistrationBreakdown(toRegistrationBreakdown(registrations));
  }, [selectedEventId]);

  React.useEffect(() => {
    void Promise.resolve().then(loadRegistrationBreakdown);
  }, [loadRegistrationBreakdown]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const matchingEvent = events.find((event) => event.dateKey === date);
    if (matchingEvent) {
      setSelectedEventId(matchingEvent.id);
      setFilterMode("all");
    } else {
      setFilterMode("day");
    }
  };

  const handleSelectEvent = (event: DashboardEvent) => {
    setSelectedEventId(event.id);
    setSelectedDate(event.dateKey);
    setMonth(monthFor(event.dateKey));
  };

  const handleToggleFilter = () => {
    setFilterMode((prev) => (prev === "all" ? "day" : "all"));
  };

  const handleCheckIn = (event: DashboardEvent) => {
    setCheckInEvent(event);
    setIsCheckInOpen(true);
  };

  const handleView = (event: DashboardEvent) => {
    router.push(`/events/${event.id}`);
  };

  const selectedEvent =
    events.find((event) => event.id === selectedEventId);
  const selectedEventWithBreakdown = selectedEvent && {
    ...selectedEvent,
    collegeBreakdown: registrationBreakdown,
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Row: Mini Calendar (fixed height) and Upcoming Events side-by-side with items-start alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          eventDates={events.map((event) => event.dateKey)}
          month={month}
          onMonthChange={setMonth}
        />
        <UpcomingEventsList
          events={events}
          selectedDate={selectedDate}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          onCheckIn={handleCheckIn}
          onView={handleView}
          filterMode={filterMode}
          onToggleFilter={handleToggleFilter}
        />
      </div>

      {/* Bottom Row: Students Registered Donut Chart for Selected Event */}
      {selectedEventWithBreakdown && <StudentsRegisteredCard event={selectedEventWithBreakdown} />}

      {/* Live Check-in Scanner Dialog */}
      {checkInEvent && (
        <LiveCheckinDialog
          open={isCheckInOpen}
          onOpenChange={setIsCheckInOpen}
          eventId={String(checkInEvent.id)}
          eventName={checkInEvent.title}
          totalAttended={checkInEvent.attendedCount}
          totalRegistered={checkInEvent.participants}
        />
      )}
    </div>
  );
}

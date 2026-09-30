"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MiniCalendar } from "./mini-calendar";
import { UpcomingEventsList } from "./upcoming-events-list";
import { StudentsRegisteredCard } from "./students-registered-card";
import { DASHBOARD_EVENTS, DashboardEvent } from "./events-data";
import { LiveCheckinDialog } from "@/components/checkin/live-checkin-dialog";

export function OverviewEventsSection() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<number>(15);
  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<"all" | "day">("all");
  const [checkInEvent, setCheckInEvent] = useState<DashboardEvent | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const eventDays = DASHBOARD_EVENTS.map((e) => e.day);

  // When a day on the calendar is clicked
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    // Find matching event on this day
    const matchingEvent = DASHBOARD_EVENTS.find((e) => e.day === day);
    if (matchingEvent) {
      setSelectedEventId(matchingEvent.id);
      setFilterMode("all");
    } else {
      setFilterMode("day");
    }
  };

  const handleSelectEvent = (event: DashboardEvent) => {
    setSelectedEventId(event.id);
    setSelectedDay(event.day);
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
    DASHBOARD_EVENTS.find((e) => e.id === selectedEventId) ||
    DASHBOARD_EVENTS[0];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Row: Mini Calendar (fixed height) and Upcoming Events side-by-side with items-start alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <MiniCalendar
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          eventDays={eventDays}
          monthName="May 2024"
        />
        <UpcomingEventsList
          events={DASHBOARD_EVENTS}
          selectedDay={selectedDay}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          onCheckIn={handleCheckIn}
          onView={handleView}
          filterMode={filterMode}
          onToggleFilter={handleToggleFilter}
        />
      </div>

      {/* Bottom Row: Students Registered Donut Chart for Selected Event */}
      <StudentsRegisteredCard event={selectedEvent} />

      {/* Live Check-in Scanner Dialog */}
      {checkInEvent && (
        <LiveCheckinDialog
          open={isCheckInOpen}
          onOpenChange={setIsCheckInOpen}
          eventId={String(checkInEvent.id)}
          eventName={checkInEvent.title}
          totalAttended={Math.round(checkInEvent.participants * 0.6)}
          totalRegistered={checkInEvent.participants}
        />
      )}
    </div>
  );
}

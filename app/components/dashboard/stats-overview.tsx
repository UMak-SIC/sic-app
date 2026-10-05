"use client";

import * as React from "react";
import { StatCard } from "./stat-card";

export function StatsOverview() {
  const [upcomingEvents, setUpcomingEvents] = React.useState(0);
  const [nextEventDate, setNextEventDate] = React.useState("No upcoming events");
  const [participantEntries, setParticipantEntries] = React.useState(0);
  const [attendanceRate, setAttendanceRate] = React.useState(0);

  const loadUpcomingEvents = React.useCallback(async () => {
    const response = await fetch("/api/events");
    if (!response.ok) return;

    const { events } = await response.json();
    const now = Date.now();
    const upcoming = events.filter((event: { startsAt: string; status: string }) =>
        event.status === "PUBLISHED" && new Date(event.startsAt).getTime() > now,
      );
    setUpcomingEvents(upcoming.length);
    const nextEvent = upcoming.sort((left: { startsAt: string }, right: { startsAt: string }) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    )[0];
    setNextEventDate(nextEvent
      ? `Next ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(nextEvent.startsAt))}`
      : "No upcoming events");
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(loadUpcomingEvents);
  }, [loadUpcomingEvents]);

  const loadAttendanceStats = React.useCallback(async () => {
    const response = await fetch("/api/attendees/insights");
    if (!response.ok) return;

    const { totals } = await response.json();
    setParticipantEntries(totals.students);
    setAttendanceRate(totals.attendanceRate);
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(loadAttendanceStats);
  }, [loadAttendanceStats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
      <StatCard
        title="Upcoming events"
        value={String(upcomingEvents)}
        subtitle={nextEventDate}
        variant="primary"
      />
      <StatCard
        title="Participant Entries"
        value={String(participantEntries)}
        subtitle="Published Events"
        variant="default"
      />
      <StatCard
        title="Attendance rate"
        value={`${attendanceRate}%`}
        subtitle="Last 30 days"
        variant="default"
      />
    </div>
  );
}

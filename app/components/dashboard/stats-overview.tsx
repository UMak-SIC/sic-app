"use client";

import * as React from "react";
import { StatCard } from "./stat-card";

export function StatsOverview() {
  const [upcomingEvents, setUpcomingEvents] = React.useState(0);
  const [participantEntries, setParticipantEntries] = React.useState(0);
  const [attendanceRate, setAttendanceRate] = React.useState(0);

  const loadUpcomingEvents = React.useCallback(async () => {
    const response = await fetch("/api/events");
    if (!response.ok) return;

    const { events } = await response.json();
    const now = Date.now();
    setUpcomingEvents(
      events.filter((event: { startsAt: string; status: string }) =>
        event.status === "PUBLISHED" && new Date(event.startsAt).getTime() > now,
      ).length,
    );
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
        subtitle="Next October 17"
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

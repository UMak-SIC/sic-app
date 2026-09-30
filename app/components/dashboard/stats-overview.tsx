"use client";

import { StatCard } from "./stat-card";

export function StatsOverview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
      <StatCard
        title="Upcoming events"
        value="150"
        subtitle="Next October 17"
        variant="primary"
      />
      <StatCard
        title="Participant Entries"
        value="150"
        subtitle="Published Events"
        variant="default"
      />
      <StatCard
        title="Attendance rate"
        value="78%"
        subtitle="Last 30 days"
        variant="default"
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { NotePencil } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { OverviewEventsSection } from "@/components/dashboard/overview-events-section";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { EventItem } from "@/components/events/events-table";

export default function OverviewPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const handleCreateEvent = (newEvent: EventItem) => {
    setIsCreateOpen(false);
    router.push(`/events/${newEvent.id}`);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pt-1 sm:pt-3">
      {/* Top Header & CTA */}
      <PageHeader
        className="mt-1 sm:mt-3"
        title={
          <>
            Welcome back!
          </>
        }
        description="Here is what needs attention today."
        action={
          <PageHeaderButton
            icon={<NotePencil size={18} weight="bold" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create New Event
          </PageHeaderButton>
        }
      />

      {/* Main Content Grid: 55% Left (KPIs + Trend Chart) and 45% Right (Calendar, Upcoming Events, Registrations) */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
        {/* Left Column (55% Width): 3 KPI Stats Cards & Attendance Trend Area Chart */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <StatsOverview />
          <AttendanceTrendChart />
        </div>

        {/* Right Column (45% Width): Fixed-Height Calendar, Overhauled Upcoming Events, and Registration Breakdown */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <OverviewEventsSection />
        </div>
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

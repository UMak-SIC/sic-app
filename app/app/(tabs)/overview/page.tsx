import { SquarePen } from "lucide-react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { UpcomingEventsList } from "@/components/dashboard/upcoming-events-list";

export const metadata = {
  title: "Overview — UMak SIC",
  description: "UMak SIC event operations and dashboard overview.",
};

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header & CTA */}
      <PageHeader
        title={
          <>
            Good Day, <span className="font-bold">Joey!</span>
          </>
        }
        description="Here is what needs attention today."
        action={
          <PageHeaderButton icon={<SquarePen className="h-4 w-4 stroke-[2.2]" />}>
            Create New Event
          </PageHeaderButton>
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: KPI Stats & Attendance Graph */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <StatsOverview />
          <AttendanceTrendChart />
        </div>

        {/* Right 1 Column: Calendar Widget & Upcoming Events Timeline */}
        <div className="flex flex-col gap-6">
          <MiniCalendar />
          <UpcomingEventsList />
        </div>
      </div>
    </div>
  );
}

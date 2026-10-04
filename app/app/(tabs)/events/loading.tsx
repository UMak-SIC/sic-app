import * as React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton";

export default function EventsLoading() {
  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <PageHeader
        title={
          <span className="font-display">
            Want to create an <span className="font-bold">event?</span>
          </span>
        }
        description="Search every draft, published, and closed event."
      />
      <EventsTableSkeleton />
    </div>
  );
}

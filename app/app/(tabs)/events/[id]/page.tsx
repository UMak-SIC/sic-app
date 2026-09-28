"use client";

import { useParams } from "next/navigation";
import { EventDetailHeader } from "@/components/events/event-detail-header";
import { EventSectionNav } from "@/components/events/event-section-nav";
import { EventReadiness } from "@/components/events/event-readiness";
import { EventVelocityChart } from "@/components/events/event-velocity-chart";
import { EventDetails } from "@/components/events/event-details";
import { EventRoster } from "@/components/events/event-roster";
import { EventStatus } from "@/components/events/event-status-badge";

/*
 * Type system for this page:
 * - font-display (Agrandir): event title, card headings, metric numerals, attendee names.
 * - font-sans (Montserrat): every label, control, table cell, badge, and body string.
 * Never put font-display on an interactive control, and never set two display
 * elements side by side without a sans element between them.
 */

const EVENTS_DATABASE: Record<
  string,
  {
    id: string;
    title: string;
    venue: string;
    date: string;
    time: string;
    status: EventStatus;
    category: string;
    registeredCount: number;
    capacity: number;
    ticketsSent: number;
    attendedCount: number;
    checkInOpens: string;
    checkInCloses: string;
  }
> = {
  evt_1: {
    id: "evt_1",
    title: "UMak SIC General Assembly",
    venue: "Audio Visual Room, Admin Building",
    date: "17 Oct 2026",
    time: "2:00 PM - 4:00 PM",
    status: "published",
    category: "General Assembly",
    registeredCount: 118,
    capacity: 150,
    ticketsSent: 109,
    attendedCount: 71,
    checkInOpens: "12:00 PM",
    checkInCloses: "6:00 PM",
  },
  evt_2: {
    id: "evt_2",
    title: "Intro to Cloud Computing",
    venue: "CCIS Lab 304",
    date: "23 Oct 2026",
    time: "1:00 PM - 3:30 PM",
    status: "published",
    category: "Workshop",
    registeredCount: 48,
    capacity: 60,
    ticketsSent: 48,
    attendedCount: 0,
    checkInOpens: "11:00 AM",
    checkInCloses: "5:30 PM",
  },
  evt_3: {
    id: "evt_3",
    title: "UI/UX Design Sprint",
    venue: "CCIS Multimedia Hall",
    date: "28 Oct 2026",
    time: "9:00 AM - 12:00 PM",
    status: "published",
    category: "Workshop",
    registeredCount: 72,
    capacity: 80,
    ticketsSent: 70,
    attendedCount: 0,
    checkInOpens: "7:00 AM",
    checkInCloses: "2:00 PM",
  },
  default: {
    id: "evt_1",
    title: "UMak SIC General Assembly",
    venue: "Audio Visual Room, Admin Building",
    date: "17 Oct 2026",
    time: "2:00 PM - 4:00 PM",
    status: "published",
    category: "General Assembly",
    registeredCount: 118,
    capacity: 150,
    ticketsSent: 109,
    attendedCount: 71,
    checkInOpens: "12:00 PM",
    checkInCloses: "6:00 PM",
  },
};

export default function EventDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const event = EVENTS_DATABASE[id as string] || EVENTS_DATABASE.default;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-12">
      <EventDetailHeader
        title={event.title}
        venue={event.venue}
        date={event.date}
        time={event.time}
        status={event.status}
        onLaunchScanner={() => {
          console.log("Launching live scanner for:", event.id);
        }}
        onEditEvent={() => {
          console.log("Opening edit event for:", event.id);
        }}
      />

      <EventSectionNav />

      <section id="readiness" className="scroll-mt-20">
        <EventReadiness
          registeredCount={event.registeredCount}
          capacity={event.capacity}
          ticketsSent={event.ticketsSent}
          attendedCount={event.attendedCount}
        />
      </section>

      <section
        id="activity"
        className="grid scroll-mt-20 grid-cols-1 gap-5 lg:grid-cols-12"
      >
        <div className="lg:col-span-7">
          <EventVelocityChart className="h-full" />
        </div>
        <div className="lg:col-span-5">
          <EventDetails
            className="h-full"
            venue={event.venue}
            date={event.date}
            time={event.time}
            category={event.category}
            capacity={event.capacity}
            checkInOpens={event.checkInOpens}
            checkInCloses={event.checkInCloses}
          />
        </div>
      </section>

      <section id="roster" className="scroll-mt-20">
        <EventRoster
          onExport={() => {
            console.log("Exporting roster CSV for:", event.id);
          }}
        />
      </section>
    </div>
  );
}

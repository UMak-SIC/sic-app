"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { EventDetailHeader } from "@/components/events/event-detail-header";
import { EventVelocityChart } from "@/components/events/event-velocity-chart";
import { EventCollegeDistribution } from "@/components/events/event-college-distribution";
import { EventRoster } from "@/components/events/event-roster";
import { EventStatus } from "@/components/events/event-status-badge";
import { LiveCheckinDialog } from "@/components/checkin/live-checkin-dialog";

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
    coverImage?: string;
  }
> = {
  "1": {
    id: "1",
    title: "UMak Tech Summit 2024",
    venue: "UMak Grand Theater",
    date: "15 May 2024",
    time: "8:00 AM - 5:00 PM",
    status: "published",
    category: "Summit",
    registeredCount: 250,
    capacity: 350,
    ticketsSent: 242,
    attendedCount: 168,
    checkInOpens: "7:30 AM",
    checkInCloses: "5:00 PM",
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
  },
  "2": {
    id: "2",
    title: "Leadership Conclave 2024",
    venue: "Admin Bldg Auditorium",
    date: "22 May 2024",
    time: "8:30 AM - 11:30 AM",
    status: "published",
    category: "Leadership",
    registeredCount: 150,
    capacity: 200,
    ticketsSent: 145,
    attendedCount: 95,
    checkInOpens: "8:00 AM",
    checkInCloses: "12:00 PM",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
  },
  "3": {
    id: "3",
    title: "SIC Innovation Showcase",
    venue: "CCIS Lab 402",
    date: "28 May 2024",
    time: "1:00 PM - 4:30 PM",
    status: "published",
    category: "Showcase",
    registeredCount: 180,
    capacity: 200,
    ticketsSent: 172,
    attendedCount: 120,
    checkInOpens: "12:30 PM",
    checkInCloses: "5:00 PM",
    coverImage:
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1600&q=80",
  },
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
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
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
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
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
    coverImage:
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1600&q=80",
  },
  evt_4: {
    id: "evt_4",
    title: "UMak Tech Summit 2026",
    venue: "Grand Auditorium",
    date: "05 Nov 2026",
    time: "8:00 AM - 5:00 PM",
    status: "draft",
    category: "Summit",
    registeredCount: 0,
    capacity: 350,
    ticketsSent: 0,
    attendedCount: 0,
    checkInOpens: "7:30 AM",
    checkInCloses: "5:30 PM",
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
  },
  evt_5: {
    id: "evt_5",
    title: "Cybersecurity Workshop",
    venue: "CCIS Lab 302",
    date: "12 Nov 2026",
    time: "2:00 PM - 5:00 PM",
    status: "draft",
    category: "Workshop",
    registeredCount: 0,
    capacity: 50,
    ticketsSent: 0,
    attendedCount: 0,
    checkInOpens: "1:30 PM",
    checkInCloses: "5:30 PM",
    coverImage:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80",
  },
  evt_6: {
    id: "evt_6",
    title: "Hackathon Orientation",
    venue: "Audio Visual Room",
    date: "10 Sep 2026",
    time: "1:30 PM - 4:00 PM",
    status: "closed",
    category: "Competition",
    registeredCount: 142,
    capacity: 150,
    ticketsSent: 142,
    attendedCount: 138,
    checkInOpens: "1:00 PM",
    checkInCloses: "4:30 PM",
    coverImage:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
  },
  evt_7: {
    id: "evt_7",
    title: "Student Leadership Induction",
    venue: "University Amphitheater",
    date: "28 Aug 2026",
    time: "8:30 AM - 11:30 AM",
    status: "closed",
    category: "Leadership",
    registeredCount: 95,
    capacity: 100,
    ticketsSent: 95,
    attendedCount: 91,
    checkInOpens: "8:00 AM",
    checkInCloses: "12:00 PM",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
  },
  evt_8: {
    id: "evt_8",
    title: "Freshmen IT Kickoff",
    venue: "Grand Auditorium",
    date: "14 Aug 2026",
    time: "9:00 AM - 12:00 PM",
    status: "closed",
    category: "Orientation",
    registeredCount: 280,
    capacity: 300,
    ticketsSent: 280,
    attendedCount: 265,
    checkInOpens: "8:30 AM",
    checkInCloses: "1:00 PM",
    coverImage:
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1600&q=80",
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
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
  },
};

export default function EventDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const event = EVENTS_DATABASE[id as string] || EVENTS_DATABASE.default;

  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  // Cross-filter state: selected college from Donut Chart filters the Attendee Roster
  const [selectedCollege, setSelectedCollege] = React.useState<string | null>(null);

  const handleExportRoster = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Student Name,Student ID,Email,College,Course,Status\n" +
      "Andrea Santos,2023-00182,andrea.santos@umak.edu.ph,CCIS,BSIT,Attended\n" +
      "Miguel Dela Cruz,2023-00491,miguel.delacruz@umak.edu.ph,CCIS,BSCS,Attended\n" +
      "Bianca Flores,2023-00612,bianca.flores@umak.edu.ph,CCIS,BSINS,Pending\n" +
      "Joshua Lim,2023-00823,joshua.lim@umak.edu.ph,CCIS,BSIT,Attended\n" +
      "Patricia Reyes,2023-00911,patricia.reyes@umak.edu.ph,CCIS,BSCS,Pending";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event.title.toLowerCase().replace(/\s+/g, "-")}-roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-14">
      {/* 1. Event Hero Banner & Actions */}
      <EventDetailHeader
        title={event.title}
        venue={event.venue}
        date={event.date}
        time={event.time}
        status={event.status}
        category={event.category}
        capacity={event.capacity}
        registeredCount={event.registeredCount}
        checkInWindow={`Check-in open until ${event.checkInCloses}`}
        coverImage={event.coverImage}
        onLaunchScanner={() => {
          setIsScannerOpen(true);
        }}
        onEditEvent={() => {
          console.log("Opening edit event dialog for:", event.id);
        }}
      />

      {/* 2. In-Page Section Navigator */}
 

      {/* 3. Activity Timeline & College Breakdown */}
      <section
        id="activity"
        className="grid scroll-mt-24 grid-cols-1 gap-5 lg:grid-cols-12"
      >
        <div className="lg:col-span-7">
          <EventVelocityChart className="h-full" />
        </div>
        <div className="lg:col-span-5">
          <EventCollegeDistribution
            className="h-full"
            selectedCollege={selectedCollege}
            onSelectCollege={setSelectedCollege}
          />
        </div>
      </section>

      {/* 4. Event Attendee Roster Table */}
      <section id="roster" className="scroll-mt-24">
        <EventRoster
          selectedCollegeFilter={selectedCollege}
          onClearCollegeFilter={() => setSelectedCollege(null)}
          onExport={handleExportRoster}
        />
      </section>

      {/* 5. Live Check-in Scanner Modal Dialog */}
      <LiveCheckinDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        eventId={event.id}
        eventName={event.title}
        totalAttended={event.attendedCount}
        totalRegistered={event.registeredCount}
      />
    </div>
  );
}

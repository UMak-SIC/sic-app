"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventItem {
  id: number;
  date: string;
  title: string;
  participants: number;
}

const events: EventItem[] = [
  {
    id: 1,
    date: "02/2026",
    title: "Event name here",
    participants: 250,
  },
  {
    id: 2,
    date: "04/2026",
    title: "Event name here",
    participants: 150,
  },
];

export function UpcomingEventsList() {
  return (
    <div className="flex flex-col mt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">
          Upcoming Events
        </h3>
      </div>

      {/* Subheaders & Filter Pill */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-3">
        <div className="flex items-center gap-6">
          <span>Date</span>
          <span>Event</span>
        </div>

        <button className="flex items-center gap-1 rounded-full bg-[#1e8e6b] px-3 py-1 text-xs font-semibold text-white shadow-2xs cursor-pointer hover:bg-[#167759] transition-colors">
          <span>All</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Timeline & Event Cards */}
      <div className="relative space-y-4">
        {events.map((evt, idx) => (
          <div key={evt.id} className="relative flex items-stretch gap-4">
            {/* Timeline Date & Vertical Line */}
            <div className="flex flex-col items-center shrink-0 w-14 pt-3">
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                {evt.date}
              </span>
              {idx < events.length - 1 && (
                <div className="w-[1px] flex-1 bg-slate-200 my-2 min-h-[50px]" />
              )}
            </div>

            {/* Event Item Box */}
            <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-start gap-3.5">
                {/* Number Badge */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm font-display">
                  {evt.id}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold font-display text-slate-900">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    {evt.participants} Participants
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-4 h-8 cursor-pointer"
                    >
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full bg-[#1e8e6b] hover:bg-[#167759] text-white text-xs font-semibold px-5 h-8 cursor-pointer"
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

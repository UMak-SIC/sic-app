"use client";

import {
  CalendarBlank,
  MapPin,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardEvent, DASHBOARD_EVENTS } from "./events-data";

interface UpcomingEventsListProps {
  events?: DashboardEvent[];
  selectedDay?: number;
  selectedEventId?: number;
  onSelectEvent?: (event: DashboardEvent) => void;
  onCheckIn?: (event: DashboardEvent) => void;
  onView?: (event: DashboardEvent) => void;
  filterMode?: "all" | "day";
  onToggleFilter?: () => void;
  className?: string;
}

export function UpcomingEventsList({
  events = DASHBOARD_EVENTS,
  selectedDay,
  selectedEventId = 1,
  onSelectEvent,
  onCheckIn,
  onView,
  filterMode = "all",
  onToggleFilter,
  className,
}: UpcomingEventsListProps) {
  // Filter events if day filter is active
  const displayedEvents =
    filterMode === "day" && selectedDay
      ? events.filter((e) => e.day === selectedDay)
      : events;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-2xs h-[350px] sm:h-[360px] min-w-0",
        className
      )}
    >
      {/* Header with Title */}
      <div className="flex items-center justify-between mb-2.5 shrink-0">
        <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 tracking-tight">
          Upcoming Events
        </h3>
      </div>

      {/* Inner Scrollable Event Cards List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
        {displayedEvents.length === 0 ? (
          <div className="text-center py-6 px-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <CalendarBlank size={24} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-700 font-sans">
              No events on Day {selectedDay}
            </p>
            {onToggleFilter && (
              <button
                onClick={onToggleFilter}
                className="text-[11px] text-[#1e8e6b] font-medium underline mt-1 cursor-pointer"
              >
                View all upcoming events
              </button>
            )}
          </div>
        ) : (
          displayedEvents.map((evt) => {
            const isSelected = evt.id === selectedEventId;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent?.(evt)}
                className={cn(
                  "rounded-xl border p-2.5 transition-all duration-150 cursor-pointer shadow-2xs",
                  isSelected
                    ? "border-emerald-500/80 bg-emerald-50/30 ring-1 ring-emerald-500/40"
                    : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {/* Top Meta: Formatted Date & Participants */}
                <div className="flex items-center justify-between gap-2 text-[10.5px] mb-1">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    <CalendarBlank size={11} weight="bold" />
                    <span>{evt.dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 text-[10.5px]">
                    <Users size={11} weight="bold" />
                    <span>{evt.participants}</span>
                  </div>
                </div>

                {/* Event Title */}
                <h4 className="text-xs font-bold font-display text-slate-900 leading-tight mb-1 truncate">
                  {evt.title}
                </h4>

                {/* Location */}
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                  <MapPin size={11} weight="bold" className="shrink-0 text-slate-400" />
                  <span className="truncate">{evt.location}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCheckIn) {
                        onCheckIn(evt);
                      } else {
                        onSelectEvent?.(evt);
                      }
                    }}
                    className="rounded-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-[10px] font-semibold px-2 h-6 cursor-pointer flex-1"
                  >
                    Check In
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onView) {
                        onView(evt);
                      } else {
                        onSelectEvent?.(evt);
                      }
                    }}
                    className="rounded-full bg-[#1e8e6b] hover:bg-[#167759] text-white text-[10px] font-semibold px-2.5 h-6 cursor-pointer flex-1"
                  >
                    View
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

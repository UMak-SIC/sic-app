"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  UploadSimple,
  DownloadSimple,
  CalendarPlus,
  Trash,
  X,
  Funnel,
  CalendarDots,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AttendeesToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  courseFilter: string;
  onCourseFilterChange: (value: string) => void;
  /** Courses actually present in the directory, from the API's facets. */
  courseOptions: string[];
  /** The event whose roster is being filtered to. Empty means every event. */
  eventIdFilter: string;
  onEventIdFilterChange: (value: string) => void;
  /** Events offered in the filter, including ones already finished. */
  eventOptions: { id: string; label: string }[];
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onClearSelection: () => void;
  onBatchAddToEvent?: () => void;
  onBatchDelete?: () => void;
  onExport: () => void;
  /** True while the export is walking the registry, so the button says so. */
  isExporting?: boolean;
  onOpenImport: () => void;
  onOpenAddStudent?: () => void;
  className?: string;
}

export function AttendeesToolbar({
  searchQuery,
  onSearchChange,
  courseFilter,
  onCourseFilterChange,
  courseOptions,
  eventIdFilter,
  onEventIdFilterChange,
  eventOptions,
  totalCount: _totalCount,
  filteredCount: _filteredCount,
  selectedCount,
  onClearSelection,
  onBatchAddToEvent,
  onBatchDelete,
  onExport,
  isExporting = false,
  onOpenImport,
  onOpenAddStudent: _onOpenAddStudent,
  className,
}: AttendeesToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 font-sans", className)}>
      {/* Top Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] sm:min-w-[240px] max-w-md w-full sm:w-auto">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <Input
              type="text"
              placeholder="Search name, student ID, or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 pl-9 pr-8 rounded-[6px] border-line bg-card text-xs text-ink placeholder:text-muted-light focus-visible:ring-1 focus-visible:ring-cyan"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/*
            Course filter, listing the courses actually in the directory.

            It used to be a fixed BSIT/BSCS/BSINS list and disabled, because the API
            could not filter by course. `course` is free text, so a fixed list could
            not have been right even once filtering worked: a registrar export
            containing anything else would have been unreachable, and students whose
            course was never recorded had no way to be found.
          */}
          <Select value={courseFilter} onValueChange={onCourseFilterChange}>
            <SelectTrigger
              aria-label="Filter by course"
              className="h-10 flex-1 sm:flex-initial sm:w-[170px] rounded-[6px] border-line bg-card text-xs font-medium text-ink cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Funnel size={14} className="text-muted shrink-0" />
                <SelectValue placeholder="All Courses" />
              </div>
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
              {courseOptions.length === 0 ? (
                <SelectItem value="none" disabled>
                  No courses recorded yet
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>

          {/*
            Event filter: students on one event's roster.

            This was labelled "All Events" but offered how many events a student had
            joined, which is a different question and the label did not describe it.
            Filtering by a named event is what the control's name promised.
          */}
          <Select value={eventIdFilter} onValueChange={onEventIdFilterChange}>
            <SelectTrigger
              aria-label="Filter by event"
              className="h-10 flex-1 sm:flex-initial sm:w-[180px] rounded-[6px] border-line bg-card text-xs font-medium text-ink cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CalendarDots size={14} className="text-muted shrink-0" />
                <SelectValue placeholder="All Events" />
              </div>
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Events</SelectItem>
              {eventOptions.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.label}
                </SelectItem>
              ))}
              {eventOptions.length === 0 ? (
                <SelectItem value="none" disabled>
                  No events yet
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            // Disabled while the export walks the registry. The button used to look
            // instant and silently built a file from one page; now it reports that it
            // is working, and cannot be pressed twice.
            disabled={isExporting}
            className="h-10 gap-1.5 rounded-[6px] border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-canvas cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <DownloadSimple size={16} weight="bold" className="text-muted" />
            <span>{isExporting ? "Exporting…" : "Export CSV"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            className="h-10 gap-1.5 rounded-[6px] border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-cyan-soft hover:text-cyan hover:border-cyan-border cursor-pointer shadow-2xs"
          >
            <UploadSimple size={16} weight="bold" className="text-cyan" />
            <span>Import List</span>
          </Button>
        </div>
      </div>

      {/* Floating Batch Actions Bar (When items selected) */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-cyan-border bg-cyan-soft/60 px-4 py-2.5 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 items-center justify-center rounded-full bg-cyan px-2 text-[11px] font-bold text-white">
              {selectedCount}
            </span>
            <span className="text-xs font-semibold text-ink">
              {selectedCount === 1 ? "student selected" : "students selected"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onBatchAddToEvent && (
              <Button
                type="button"
                size="sm"
                onClick={onBatchAddToEvent}
                className="h-8 gap-1.5 rounded-[6px] bg-cyan hover:bg-cyan-hover px-3 text-xs font-semibold text-white shadow-2xs cursor-pointer"
              >
                <CalendarPlus size={14} weight="bold" />
                <span>Add to Event</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 gap-1.5 rounded-[6px] border-line bg-card px-3 text-xs font-semibold text-ink hover:bg-canvas shadow-2xs cursor-pointer"
            >
              <DownloadSimple size={14} weight="bold" className="text-muted" />
              <span>Export Selected</span>
            </Button>

            {onBatchDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBatchDelete}
                className="h-8 gap-1.5 rounded-[6px] border-red/30 bg-card px-3 text-xs font-semibold text-red hover:bg-red-soft shadow-2xs cursor-pointer"
              >
                <Trash size={14} />
                <span>Remove</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-8 w-8 rounded-[6px] text-muted hover:text-ink cursor-pointer"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X size={16} weight="bold" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

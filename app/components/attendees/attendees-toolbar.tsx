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
  UserPlus,
  CalendarPlus,
  Trash,
  X,
  Funnel,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AttendeesToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  courseFilter: string;
  onCourseFilterChange: (value: string) => void;
  eventsFilter: string;
  onEventsFilterChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onClearSelection: () => void;
  onBatchAddToEvent?: () => void;
  onBatchDelete?: () => void;
  onExport: () => void;
  onOpenImport: () => void;
  onOpenAddStudent?: () => void;
  className?: string;
}

export function AttendeesToolbar({
  searchQuery,
  onSearchChange,
  courseFilter,
  onCourseFilterChange,
  eventsFilter,
  onEventsFilterChange,
  totalCount,
  filteredCount,
  selectedCount,
  onClearSelection,
  onBatchAddToEvent,
  onBatchDelete,
  onExport,
  onOpenImport,
  onOpenAddStudent,
  className,
}: AttendeesToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 font-sans", className)}>
      {/* Top Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
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

          {/* Course Filter (BSIT / BSCS / BSINS) */}
          <Select value={courseFilter} onValueChange={onCourseFilterChange}>
            <SelectTrigger className="h-10 w-[160px] rounded-[6px] border-line bg-card text-xs font-medium text-ink cursor-pointer">
              <div className="flex items-center gap-1.5 truncate">
                <Funnel size={14} className="text-muted shrink-0" />
                <SelectValue placeholder="All Courses" />
              </div>
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="BSIT">BSIT (Info Tech)</SelectItem>
              <SelectItem value="BSCS">BSCS (Comp Sci)</SelectItem>
              <SelectItem value="BSINS">BSINS (Info Systems)</SelectItem>
            </SelectContent>
          </Select>

          {/* Events Joined Filter */}
          <Select value={eventsFilter} onValueChange={onEventsFilterChange}>
            <SelectTrigger className="h-10 w-[150px] rounded-[6px] border-line bg-card text-xs font-medium text-ink cursor-pointer">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="active">Joined ≥1 Event</SelectItem>
              <SelectItem value="unassigned">Not in Any Event (0)</SelectItem>
              <SelectItem value="multiple">3+ Events Joined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-10 gap-1.5 rounded-[6px] border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-canvas cursor-pointer shadow-2xs"
          >
            <DownloadSimple size={16} weight="bold" className="text-muted" />
            <span>Export CSV</span>
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

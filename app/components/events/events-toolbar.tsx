"use client";

import * as React from "react";
import {
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface EventsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onExportSelected: () => void;
  className?: string;
}

export function EventsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  onClearSelection,
  onExportSelected,
  className,
}: EventsToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left controls: Search input & Status Filter */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-sm">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-[8px] border border-line bg-card pl-10 pr-9 text-sm font-sans text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              aria-label="Clear search"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="w-[150px]">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-10 text-sm font-sans rounded-[8px]">
              <div className="flex items-center gap-2 truncate">
                <Funnel size={15} className="text-muted shrink-0" />
                <SelectValue placeholder="All Statuses" />
              </div>
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right controls: Batch actions or Export */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2.5 rounded-[8px] border border-cyan-border bg-cyan-soft px-3.5 py-1.5 text-sm font-sans text-ink animate-in fade-in-50">
            <span className="font-semibold text-cyan">
              {selectedCount} selected
            </span>
            <div className="h-4 w-px bg-cyan-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportSelected}
              className="h-7 px-2 text-xs font-semibold text-ink hover:bg-white/60 cursor-pointer"
            >
              <DownloadSimple size={15} weight="bold" className="mr-1" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-7 px-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              aria-label="Clear selection"
            >
              <X size={15} weight="bold" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportSelected}
            className="h-10 rounded-[8px] border-line px-4 text-sm font-sans font-semibold text-ink hover:bg-canvas cursor-pointer"
          >
            <DownloadSimple size={16} weight="bold" className="mr-2" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

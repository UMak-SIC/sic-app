"use client";

import * as React from "react";
import {
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  UploadSimple,
  CheckCircle,
  Trash,
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

interface AttendeesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  totalCount: number;
  filteredCount: number;
  selectedCount?: number;
  onClearSelection?: () => void;
  onBatchMarkAttended?: () => void;
  onBatchDelete?: () => void;
  onExport: () => void;
  onOpenImport?: () => void;
  className?: string;
}

export function AttendeesToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  selectedCount = 0,
  onClearSelection,
  onBatchMarkAttended,
  onBatchDelete,
  onExport,
  onOpenImport,
  className,
}: AttendeesToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-sans",
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
            placeholder="Search attendee by name or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-[8px] border border-line bg-card pl-10 pr-9 text-sm font-sans text-ink placeholder:text-muted focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 transition-all"
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
            <SelectTrigger className="h-10 text-sm font-sans rounded-[8px] border-line">
              <div className="flex items-center gap-2 truncate">
                <Funnel size={15} className="text-muted shrink-0" />
                <SelectValue placeholder="All Statuses" />
              </div>
            </SelectTrigger>
            <SelectContent className="font-sans">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="attended">Attended</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right controls: Batch actions or Standard Export & Import */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 rounded-[8px] border border-cyan-border bg-cyan-soft px-3 py-1.5 text-xs font-sans text-ink animate-in fade-in-50">
            <span className="font-semibold text-cyan mr-1">
              {selectedCount} selected
            </span>

            {onBatchMarkAttended && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBatchMarkAttended}
                className="h-7 px-2 text-xs font-semibold text-[#176c59] hover:bg-white/60 cursor-pointer"
              >
                <CheckCircle size={14} weight="bold" className="mr-1" />
                Mark Attended
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="h-7 px-2 text-xs font-semibold text-ink hover:bg-white/60 cursor-pointer"
            >
              <DownloadSimple size={14} weight="bold" className="mr-1" />
              Export
            </Button>

            {onBatchDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBatchDelete}
                className="h-7 px-2 text-xs font-semibold text-red hover:bg-white/60 cursor-pointer"
              >
                <Trash size={14} weight="bold" className="mr-1" />
                Delete
              </Button>
            )}

            <div className="h-3.5 w-px bg-cyan-border mx-0.5" />

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="p-1 text-muted hover:text-ink cursor-pointer"
                title="Clear selection"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onOpenImport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenImport}
                className="h-10 rounded-[8px] border-line px-3.5 text-sm font-sans font-semibold text-ink hover:bg-canvas cursor-pointer"
              >
                <UploadSimple size={16} weight="bold" className="mr-1.5 text-cyan" />
                Import CSV
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-10 rounded-[8px] border-line px-3.5 text-sm font-sans font-semibold text-ink hover:bg-canvas cursor-pointer"
            >
              <DownloadSimple size={16} weight="bold" className="mr-1.5" />
              Export CSV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

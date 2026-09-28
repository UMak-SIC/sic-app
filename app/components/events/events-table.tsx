"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventStatusBadge, EventStatus } from "./event-status-badge";
import { EventAttendanceMeter } from "./event-attendance-meter";
import {
  DotsThreeVertical,
  DotsSixVertical,
  QrCode,
  Eye,
  DownloadSimple,
  PencilSimple,
  Copy,
  Trash,
  CalendarBlank,
  Clock,
  MapPin,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface EventItem {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  status: EventStatus;
  registeredCount: number;
  capacity: number;
  attendedCount?: number;
}

interface EventsTableProps {
  events: EventItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onReorder?: (events: EventItem[]) => void;
  onCheckInClick?: (event: EventItem) => void;
  onViewClick?: (event: EventItem) => void;
  onExportClick?: (event: EventItem) => void;
}

// Status accent configuration matching DESIGN.md color palette
const STATUS_ACCENTS: Record<
  EventStatus,
  {
    borderLeftClass: string;
    label: string;
  }
> = {
  published: {
    borderLeftClass: "border-l-green",
    label: "Published",
  },
  draft: {
    borderLeftClass: "border-l-amber",
    label: "Draft",
  },
  closed: {
    borderLeftClass: "border-l-muted-light",
    label: "Closed",
  },
};

export function EventsTable({
  events,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onReorder,
  onCheckInClick,
  onViewClick,
  onExportClick,
}: EventsTableProps) {
  // Local list state to support immediate responsive reordering
  const [items, setItems] = React.useState<EventItem[]>(events);

  // Sync internal items when parent events change
  React.useEffect(() => {
    setItems(events);
  }, [events]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"top" | "bottom" | null>(null);

  const isAllSelected =
    items.length > 0 && selectedIds.length === items.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  const handleReorder = (newItems: EventItem[]) => {
    setItems(newItems);
    onReorder?.(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index - 1, 0, moved);
    handleReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index + 1, 0, moved);
    handleReorder(newItems);
  };

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const targetRow = e.currentTarget;
    const rect = targetRow.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTop = relativeY < rect.height / 2;

    setDragOverIndex(index);
    setDropPosition(isTop ? "top" : "bottom");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    // Only clear if leaving the current row target
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex && dropPosition === "top") {
      insertIndex = targetIndex - 1;
    } else if (draggedIndex > targetIndex && dropPosition === "bottom") {
      insertIndex = targetIndex + 1;
    }

    newItems.splice(insertIndex, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);

    handleReorder(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-line bg-card py-16 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
          <CalendarBlank size={24} weight="bold" />
        </div>
        <h3 className="font-display text-base font-bold text-ink">
          No events found
        </h3>
        <p className="mt-1 font-sans text-sm text-muted max-w-sm">
          No event records match your current search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
            <TableHead className="w-14 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="w-6" aria-hidden="true" />
                <Checkbox
                  checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all events"
                />
              </div>
            </TableHead>
            <TableHead className="w-[28%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Event
            </TableHead>
            <TableHead className="w-[22%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Attendance
            </TableHead>
            <TableHead className="w-[20%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Date & Time
            </TableHead>
            <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Status
            </TableHead>
            <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((evt, index) => {
            const isSelected = selectedIds.includes(evt.id);
            const isBeingDragged = draggedIndex === index;
            const isOverTarget = dragOverIndex === index;
            const accent = STATUS_ACCENTS[evt.status] || STATUS_ACCENTS.draft;

            const count =
              evt.status === "closed"
                ? evt.attendedCount || evt.registeredCount
                : evt.registeredCount;

            return (
              <TableRow
                key={evt.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "group transition-all duration-150 border-l-[4px]",
                  accent.borderLeftClass,
                  isSelected && "bg-cyan-soft/30 hover:bg-cyan-soft/40",
                  isBeingDragged && "opacity-40 bg-cyan-soft/20 scale-[0.99] shadow-sm",
                  isOverTarget && dropPosition === "top" && "border-t-2 border-t-cyan",
                  isOverTarget && dropPosition === "bottom" && "border-b-2 border-b-cyan"
                )}
              >
                {/* Drag Grip + Checkbox */}
                <TableCell className="pl-3 py-3.5">
                  <div className="flex items-center gap-2">
                    {/* Drag Handle */}
                    <button
                      type="button"
                      tabIndex={0}
                      className="flex items-center justify-center size-6 rounded-[4px] text-muted-light hover:text-ink hover:bg-canvas cursor-grab active:cursor-grabbing transition-colors"
                      title="Drag to rearrange event card"
                      aria-label={`Drag to rearrange ${evt.title}`}
                    >
                      <DotsSixVertical size={16} weight="bold" />
                    </button>

                    {/* Select Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(evt.id)}
                      aria-label={`Select ${evt.title}`}
                    />
                  </div>
                </TableCell>

                {/* Event Title & Venue */}
                <TableCell className="truncate py-3.5">
                  <div className="flex flex-col gap-1 max-w-[95%]">
                    <span className="font-sans text-base font-bold text-ink group-hover:text-cyan transition-colors truncate">
                      {evt.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                      <MapPin size={13} className="shrink-0 text-muted-light group-hover:text-muted transition-colors" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Attendance Count & Meter */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-1.5 pr-4">
                    <div className="flex items-baseline gap-1 text-xs">
                      <span className="font-display font-bold text-sm text-ink">
                        {count}
                      </span>
                      <span className="font-sans text-xs text-muted">
                        / {evt.capacity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EventAttendanceMeter
                        current={count}
                        capacity={evt.capacity}
                        status={evt.status}
                        totalTicks={16}
                      />
                      <span className="font-sans text-xs font-medium text-muted tabular-nums shrink-0">
                        {Math.round((count / evt.capacity) * 100)}%
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Date & Time */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col gap-1 font-sans">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <CalendarBlank size={14} className="shrink-0 text-muted" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock size={13} className="shrink-0 text-muted-light" />
                      <span>{evt.time}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Status Badge */}
                <TableCell className="py-3.5">
                  <EventStatusBadge status={evt.status} />
                </TableCell>

                {/* Row Actions */}
                <TableCell className="text-right pr-4 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {evt.status === "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onCheckInClick?.(evt)}
                        className="h-8 gap-1.5 rounded-full bg-green hover:bg-green-hover px-3.5 text-xs font-sans font-semibold text-white shadow-xs cursor-pointer"
                      >
                        <QrCode size={15} weight="bold" />
                        <span>Check In</span>
                      </Button>
                    ) : evt.status === "closed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExportClick?.(evt)}
                        className="h-8 gap-1 rounded-full border-line px-3 text-xs font-sans font-semibold text-ink hover:bg-canvas cursor-pointer"
                      >
                        <DownloadSimple size={14} weight="bold" />
                        <span>Export</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewClick?.(evt)}
                        className="h-8 gap-1 rounded-full border-line px-3 text-xs font-sans font-semibold text-ink hover:bg-canvas cursor-pointer"
                      >
                        <PencilSimple size={14} weight="bold" />
                        <span>Edit</span>
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                          aria-label="Event options"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 font-sans">
                        <DropdownMenuItem
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-xs"
                        >
                          <ArrowUp size={15} className="mr-2 text-muted" />
                          Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveDown(index)}
                          disabled={index === items.length - 1}
                          className="text-xs"
                        >
                          <ArrowDown size={15} className="mr-2 text-muted" />
                          Move Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewClick?.(evt)} className="text-xs">
                          <Eye size={15} className="mr-2 text-muted" />
                          View
                        </DropdownMenuItem>
                        {evt.status === "published" && (
                          <DropdownMenuItem onClick={() => onCheckInClick?.(evt)} className="text-xs">
                            <QrCode size={15} className="mr-2 text-muted" />
                            Scanner
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onExportClick?.(evt)} className="text-xs">
                          <DownloadSimple size={15} className="mr-2 text-muted" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs">
                          <Copy size={15} className="mr-2 text-muted" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-red focus:text-red focus:bg-red-soft">
                          <Trash size={15} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

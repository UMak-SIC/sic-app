"use client";

import * as React from "react";
import {
  QrCode,
  DotsThreeVertical,
  ShareNetwork,
  Copy,
  PencilSimple,
  Trash,
  MapPin,
  CalendarBlank,
  Clock,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventStatusBadge, EventStatus } from "./event-status-badge";
import { cn } from "@/lib/utils";

interface EventDetailHeaderProps {
  title: string;
  venue: string;
  date: string;
  time: string;
  status: EventStatus;
  category?: string;
  capacity?: number;
  registeredCount?: number;
  checkInWindow?: string;
  coverImage?: string;
  onLaunchScanner?: () => void;
  onEditEvent?: () => void;
  className?: string;
}

const DEFAULT_EVENT_COVER =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80";

export function EventDetailHeader({
  title,
  venue,
  date,
  time,
  status,
  category = "General Assembly",
  capacity = 150,
  registeredCount = 118,
  checkInWindow = "Check-in open until 6:00 PM",
  coverImage = DEFAULT_EVENT_COVER,
  onLaunchScanner,
  onEditEvent,
  className,
}: EventDetailHeaderProps) {
  const isPublished = status === "published";
  const capacityPercent = Math.min(100, Math.round((registeredCount / capacity) * 100));

  return (
    <div className={cn("flex flex-col gap-4 w-full", className)}>
      {/* Event Cover Image Banner */}
      <div className="relative w-full min-h-[260px] sm:min-h-0 sm:h-60 md:h-64 rounded-[16px] overflow-hidden border border-line shadow-2xs group bg-ink flex flex-col justify-between p-4">
        <img
          src={coverImage}
          alt={`${title} cover`}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {/* Subtle dark teal scrim overlay for optimal contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/50 to-ink/20 pointer-events-none" />

        {/* Top Badges overlay on banner */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-paper/90 backdrop-blur-md px-3 py-1 font-sans text-xs font-semibold text-ink shadow-sm border border-line">
              {category}
            </span>
            <EventStatusBadge status={status} className="backdrop-blur-md" />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-ink/75 backdrop-blur-md px-3 py-1 font-sans text-xs font-medium text-paper border border-white/10">
            <Clock size={14} weight="bold" className="text-cyan" />
            <span>{checkInWindow}</span>
          </div>
        </div>

        {/* Bottom Banner Content */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-4">
          <div className="flex flex-col gap-1 max-w-2xl">
            <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs sm:text-sm text-paper/90">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} weight="bold" className="text-cyan shrink-0" />
                {venue}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank size={15} weight="bold" className="text-cyan shrink-0" />
                {date} · {time}
              </span>
            </div>
          </div>

          {/* Capacity Progress Pill */}
          <div className="self-start sm:self-auto shrink-0 flex items-center gap-2 rounded-full bg-ink/80 backdrop-blur-md px-3.5 py-1.5 border border-white/15">
            <Users size={15} weight="bold" className="text-cyan" />
            <span className="font-sans text-xs font-semibold text-white">
              {registeredCount} / {capacity} attendees
            </span>
            <span className="rounded-full bg-cyan/30 px-2 py-0.5 text-[10px] font-bold text-cyan-soft">
              {capacityPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar directly underneath Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 font-sans text-xs text-muted">
          <span className="inline-block size-2 rounded-full bg-green animate-pulse" />
          <span>Live attendance window active</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isPublished ? (
            <Button
              size="sm"
              onClick={onLaunchScanner}
              className="h-9 cursor-pointer gap-2 rounded-full bg-cyan px-4 sm:px-5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover active:translate-y-px"
            >
              <QrCode size={16} weight="bold" />
              <span>Launch live scanner</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditEvent}
              className="h-9 cursor-pointer gap-1.5 rounded-full border-line px-3.5 font-sans text-xs font-semibold text-ink hover:bg-canvas active:translate-y-px"
            >
              <PencilSimple size={15} weight="bold" />
              <span>Edit event details</span>
            </Button>
          )}

          {isPublished && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditEvent}
              className="h-9 cursor-pointer gap-1.5 rounded-full border-line px-3.5 font-sans text-xs font-semibold text-ink hover:bg-canvas active:translate-y-px"
            >
              <PencilSimple size={15} weight="bold" />
              <span>Edit event</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-line text-muted hover:bg-canvas hover:text-ink cursor-pointer"
                aria-label="More event actions"
              >
                <DotsThreeVertical size={18} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-sans">
              <DropdownMenuItem className="text-xs cursor-pointer">
                <ShareNetwork size={15} className="mr-2 text-muted" />
                Share registration link
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs cursor-pointer">
                <Copy size={15} className="mr-2 text-muted" />
                Duplicate event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red focus:text-red focus:bg-red-soft cursor-pointer">
                <Trash size={15} className="mr-2" />
                Delete event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

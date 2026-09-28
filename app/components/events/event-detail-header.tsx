"use client";

import Link from "next/link";
import {
  ArrowLeft,
  QrCode,
  DotsThreeVertical,
  ShareNetwork,
  Copy,
  PencilSimple,
  Trash,
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
  onLaunchScanner?: () => void;
  onEditEvent?: () => void;
  className?: string;
}

export function EventDetailHeader({
  title,
  venue,
  date,
  time,
  status,
  onLaunchScanner,
  onEditEvent,
  className,
}: EventDetailHeaderProps) {
  const isPublished = status === "published";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Link
        href="/events"
        className="inline-flex w-fit items-center gap-1.5 font-sans text-xs font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} weight="bold" />
        <span>Back to events</span>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            <EventStatusBadge status={status} />
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-muted">
            <span>{venue}</span>
            <span className="h-3 w-px bg-line" aria-hidden="true" />
            <span>{date}</span>
            <span className="h-3 w-px bg-line" aria-hidden="true" />
            <span>{time}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isPublished ? (
            <Button
              size="sm"
              onClick={onLaunchScanner}
              className="h-9 cursor-pointer gap-2 rounded-full bg-cyan px-5 font-sans text-xs font-semibold text-white shadow-xs hover:bg-cyan-hover active:translate-y-px"
            >
              <QrCode size={16} weight="bold" />
              <span>Launch scanner</span>
            </Button>
          ) : (
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
                aria-label="More actions"
              >
                <DotsThreeVertical size={18} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 font-sans">
              {isPublished && (
                <DropdownMenuItem onClick={onEditEvent} className="text-xs">
                  <PencilSimple size={15} className="mr-2 text-muted" />
                  Edit event
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-xs">
                <ShareNetwork size={15} className="mr-2 text-muted" />
                Share link
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <Copy size={15} className="mr-2 text-muted" />
                Duplicate event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red focus:text-red focus:bg-red-soft">
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

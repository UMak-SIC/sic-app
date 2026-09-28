import * as React from "react";
import { cn } from "@/lib/utils";

export type EventStatus = "published" | "draft" | "closed";

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const configs: Record<
    EventStatus,
    { label: string; containerClass: string }
  > = {
    published: {
      label: "Published",
      containerClass: "bg-green-soft text-green border-green-border",
    },
    draft: {
      label: "Draft",
      containerClass: "bg-amber-soft text-amber border-amber-border",
    },
    closed: {
      label: "Closed",
      containerClass: "bg-canvas text-muted border-line",
    },
  };

  const config = configs[status] || configs.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-sans font-semibold tracking-normal transition-colors",
        config.containerClass,
        className
      )}
    >
      {config.label}
    </span>
  );
}

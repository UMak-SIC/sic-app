import * as React from "react";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AttendanceStatus = "PENDING" | "ATTENDED" | "ABSENT";

const ATTENDANCE_BADGES: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  ATTENDED: {
    label: "Attended",
    icon: CheckCircle,
    badgeClass: "border-green-border bg-green-soft text-green",
  },
  ABSENT: {
    label: "Absent",
    icon: XCircle,
    badgeClass: "border-red-border bg-red-soft text-red",
  },
  PENDING: {
    label: "Not recorded",
    icon: Clock,
    badgeClass: "border-amber-border bg-amber-soft text-amber",
  },
};

export function attendanceStatusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_BADGES[status]?.label ?? "Not recorded";
}

export function AttendanceStatusBadge({
  status,
  withLabel = true,
  className,
}: {
  status: AttendanceStatus;
  withLabel?: boolean;
  className?: string;
}) {
  const { label, icon: Icon, badgeClass } = ATTENDANCE_BADGES[status] ?? ATTENDANCE_BADGES.PENDING;

  return (
    <Badge
      className={cn(
        "gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-none",
        badgeClass,
        className,
      )}
    >
      <Icon size={14} weight="bold" aria-hidden="true" />
      {withLabel ? label : null}
    </Badge>
  );
}

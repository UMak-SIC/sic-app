"use client";

import { cn } from "@/lib/utils";

interface EventReadinessProps {
  registeredCount: number;
  capacity: number;
  ticketsSent: number;
  attendedCount: number;
  className?: string;
}

export function EventReadiness({
  registeredCount,
  capacity,
  ticketsSent,
  attendedCount,
  className,
}: EventReadinessProps) {
  const registeredPct =
    capacity > 0 ? Math.min(100, Math.round((registeredCount / capacity) * 100)) : 0;
  const ticketsPct =
    registeredCount > 0
      ? Math.min(100, Math.round((ticketsSent / registeredCount) * 100))
      : 0;
  const checkedInPct =
    registeredCount > 0
      ? Math.min(100, Math.round((attendedCount / registeredCount) * 100))
      : 0;

  const columns = [
    {
      label: "Registered",
      value: registeredCount,
      detail: `of ${capacity} capacity`,
      percent: registeredPct,
      emphasized: false,
    },
    {
      label: "Tickets sent",
      value: ticketsSent,
      detail: `of ${registeredCount} registered`,
      percent: ticketsPct,
      emphasized: false,
    },
    {
      label: "Checked in",
      value: attendedCount,
      detail: `of ${registeredCount} registered`,
      percent: checkedInPct,
      emphasized: true,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-[12px] border border-line bg-card shadow-2xs",
        className
      )}
    >
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="font-display text-sm font-bold text-ink">Readiness</h2>
      </div>

      <div className="grid grid-cols-1 divide-y divide-line-subtle sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {columns.map((column) => (
          <div key={column.label} className="flex flex-col gap-2.5 px-5 py-4">
            <span className="font-sans text-xs font-medium text-muted">
              {column.label}
            </span>

            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold leading-none text-ink tabular-nums">
                {column.value}
              </span>
              <span className="font-sans text-xs text-muted">
                {column.detail}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-1.5 flex-1">
                <div
                  className={cn(
                    "h-full rounded-full",
                    column.emphasized ? "bg-green" : "bg-ink/70"
                  )}
                  style={{ width: `${column.percent}%` }}
                />
              </div>
              <span className="font-sans text-xs font-semibold text-muted tabular-nums">
                {column.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

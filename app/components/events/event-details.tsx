"use client";

import { cn } from "@/lib/utils";

interface EventDetailsProps {
  venue: string;
  date: string;
  time: string;
  category: string;
  capacity: number;
  checkInOpens: string;
  checkInCloses: string;
  className?: string;
}

export function EventDetails({
  venue,
  date,
  time,
  category,
  capacity,
  checkInOpens,
  checkInCloses,
  className,
}: EventDetailsProps) {
  const rows: Array<{ label: string; value: string; secondary?: string }> = [
    { label: "Schedule", value: date, secondary: time },
    { label: "Location", value: venue },
    { label: "Check-in window", value: `${checkInOpens} - ${checkInCloses}` },
    { label: "Category", value: category },
    { label: "Capacity", value: `${capacity} attendees` },
  ];

  return (
    <div
      className={cn(
        "rounded-[12px] border border-line bg-card shadow-2xs",
        className
      )}
    >
      <div className="border-b border-line-subtle px-5 py-4">
        <h2 className="font-display text-sm font-bold text-ink">
          Event details
        </h2>
      </div>

      <dl className="divide-y divide-line-subtle px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 py-3"
          >
            <dt className="font-sans text-xs text-muted">{row.label}</dt>
            <dd className="text-right">
              <span className="block font-sans text-sm font-semibold text-ink">
                {row.value}
              </span>
              {row.secondary && (
                <span className="block font-sans text-xs text-muted">
                  {row.secondary}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

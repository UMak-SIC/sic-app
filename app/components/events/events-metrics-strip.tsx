import * as React from "react";
import {
  CalendarBlank,
  Broadcast,
  QrCode,
  ChartLineUp,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  trend?: string;
  highlight?: boolean;
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  trend,
  highlight,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-[12px] border p-4 transition-all duration-200",
        highlight
          ? "bg-cyan-soft border-cyan-border text-ink"
          : "bg-card border-line hover:border-line-subtle text-ink shadow-2xs"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-sans font-medium text-muted">{label}</span>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-[8px]",
            highlight ? "bg-cyan text-white" : "bg-canvas text-ink"
          )}
        >
          {icon}
        </div>
      </div>

      <div className="my-2.5 flex items-baseline gap-2">
        <span className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">
          {value}
        </span>
        {trend && (
          <span className="text-[11px] font-sans font-semibold text-green">
            {trend}
          </span>
        )}
      </div>

      <p className="text-[11px] font-sans text-muted">{subtext}</p>
    </div>
  );
}

export function EventsMetricsStrip() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Events"
        value="28"
        subtext="All campus lifecycle records"
        icon={<CalendarBlank size={18} weight="bold" />}
      />
      <MetricCard
        label="Published & Upcoming"
        value="6"
        subtext="Open for registration"
        icon={<Broadcast size={18} weight="bold" />}
        trend="+2 this month"
      />
      <MetricCard
        label="Live Now"
        value="1"
        subtext="UMak SIC General Assembly"
        icon={<QrCode size={18} weight="bold" />}
        highlight
      />
      <MetricCard
        label="Avg Attendance Rate"
        value="84.2%"
        subtext="Past 30 days active roster"
        icon={<ChartLineUp size={18} weight="bold" />}
        trend="+5.4%"
      />
    </div>
  );
}

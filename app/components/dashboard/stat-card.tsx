"use client";

import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  variant?: "primary" | "default";
  onActionClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  variant = "default",
  onActionClick,
  className,
}: StatCardProps) {
  const isPrimary = variant === "primary";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between min-h-[160px] sm:min-h-[175px] rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-2xs",
        isPrimary
          ? "bg-linear-to-r from-[#198d5d] to-[#2da482] text-white border-0 shadow-sm"
          : "bg-white text-slate-900 border border-slate-200/70 hover:border-slate-300",
        className
      )}
    >
      {/* Header with Title and Action Icon */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-xs sm:text-sm font-medium leading-snug line-clamp-1",
            isPrimary ? "text-white/95" : "text-slate-600"
          )}
        >
          {title}
        </span>

        <button
          onClick={onActionClick}
          className={cn(
            "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer",
            isPrimary
              ? "bg-white text-[#198d5d] shadow-xs"
              : "bg-slate-100/90 text-slate-600 border border-slate-200/50 hover:bg-slate-200"
          )}
          aria-label={`View details for ${title}`}
        >
          <ArrowUpRight size={14} weight="bold" />
        </button>
      </div>

      {/* Main Metric Value */}
      <div className="my-2 sm:my-3">
        <span
          className={cn(
            "text-3xl sm:text-4xl lg:text-3xl xl:text-4xl font-display font-bold tracking-tight leading-none",
            isPrimary ? "text-white" : "text-slate-900"
          )}
        >
          {value}
        </span>
      </div>

      {/* Footer Subtitle */}
      <div>
        <span
          className={cn(
            "text-xs font-sans font-normal",
            isPrimary ? "text-emerald-100/90" : "text-slate-500"
          )}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}

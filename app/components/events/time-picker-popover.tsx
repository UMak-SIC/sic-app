"use client";

import * as React from "react";
import { Clock, Check, Sun, Moon, CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface TimePickerPopoverProps {
  value: string; // e.g. "9:00 am"
  onChange: (newValue: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ["00", "15", "30", "45"];
const COMMON_PRESETS = [
  { label: "8:00 AM", value: "8:00 am" },
  { label: "9:00 AM", value: "9:00 am" },
  { label: "1:00 PM", value: "1:00 pm" },
  { label: "2:30 PM", value: "2:30 pm" },
  { label: "5:00 PM", value: "5:00 pm" },
];

function parseTimeString(timeStr: string) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) {
    return { hour: 9, minute: "00", period: "am" as "am" | "pm" };
  }
  let h = parseInt(match[1], 10);
  if (h < 1) h = 12;
  if (h > 12) h = 12;
  const m = match[2];
  const p = (match[3]?.toLowerCase() || "am") as "am" | "pm";
  return { hour: h, minute: m, period: p };
}

export function TimePickerPopover({
  value,
  onChange,
  disabled = false,
  className,
}: TimePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { hour, minute, period } = React.useMemo(
    () => parseTimeString(value),
    [value]
  );

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const updateTime = (newHour: number, newMin: string, newPeriod: "am" | "pm") => {
    onChange(`${newHour}:${newMin} ${newPeriod}`);
  };

  const formattedDisplay = `${hour}:${minute} ${period.toUpperCase()}`;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between w-full h-8 rounded-lg bg-canvas/80 border border-line px-2.5 font-sans text-[11px] font-semibold text-ink cursor-pointer transition-all hover:bg-canvas hover:border-[#2da482]/50 focus:outline-none focus:ring-1 focus:ring-[#2da482]",
          open && "border-[#2da482] ring-1 ring-[#2da482] bg-white",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <span className="truncate">{formattedDisplay}</span>
        <Clock
          size={13}
          weight="bold"
          className={cn(
            "text-muted transition-colors shrink-0",
            open && "text-[#2da482]"
          )}
        />
      </button>

      {/* Floating Clock Picker Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-line bg-white dark:bg-card p-4 shadow-xl font-sans text-ink"
            style={{
              boxShadow: "0 12px 36px -8px rgba(0, 0, 0, 0.16)",
            }}
          >
            {/* Header: Large Digital Display + AM/PM Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-extrabold text-ink tracking-tight">
                  {hour < 10 ? `0${hour}` : hour}:{minute}
                </span>
                <span className="font-sans text-xs font-bold text-[#2da482] uppercase ml-1">
                  {period}
                </span>
              </div>

              {/* AM / PM Segmented Switch */}
              <div className="flex items-center p-0.5 rounded-lg bg-canvas border border-line text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => updateTime(hour, minute, "am")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-[6px] transition-all cursor-pointer",
                    period === "am"
                      ? "bg-[#2da482] text-white shadow-2xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Sun size={12} weight={period === "am" ? "fill" : "bold"} />
                  <span>AM</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateTime(hour, minute, "pm")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-[6px] transition-all cursor-pointer",
                    period === "pm"
                      ? "bg-[#2da482] text-white shadow-2xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Moon size={12} weight={period === "pm" ? "fill" : "bold"} />
                  <span>PM</span>
                </button>
              </div>
            </div>

            {/* Hour Selector (Circular / Grid Format) */}
            <div className="pt-3">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                Select Hour
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {HOURS.map((h) => {
                  const isSelected = h === hour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, minute, period)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl font-sans text-xs font-semibold transition-all cursor-pointer select-none",
                        isSelected
                          ? "bg-[#2da482] text-white font-bold shadow-xs scale-105"
                          : "bg-canvas/60 text-ink hover:bg-[#2da482]/15 hover:text-ink"
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Selector */}
            <div className="pt-3">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                Select Minute
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {MINUTES.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(hour, m, period)}
                      className={cn(
                        "flex h-7 items-center justify-center rounded-lg font-sans text-xs font-semibold transition-all cursor-pointer select-none",
                        isSelected
                          ? "bg-[#2da482] text-white font-bold shadow-2xs"
                          : "bg-canvas/60 text-ink hover:bg-[#2da482]/15 hover:text-ink"
                      )}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-3 border-t border-line-subtle mt-3">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                Common Presets
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onChange(preset.value);
                      setOpen(false);
                    }}
                    className="px-2 py-1 rounded-md bg-canvas text-[10px] font-semibold text-muted hover:text-ink hover:bg-[#2da482]/20 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Done Action */}
            <div className="pt-3 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2da482] hover:bg-[#269374] text-white font-sans text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Check size={12} weight="bold" />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

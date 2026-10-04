"use client";

import * as React from "react";
import { Clock } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { ClockPicker } from "./clock-picker";
import { cn } from "@/lib/utils";

interface TimePickerPopoverProps {
  value: string; // e.g. "9:00 am"
  onChange: (newValue: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePickerPopover({
  value,
  onChange,
  disabled = false,
  className,
}: TimePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
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

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Clock Trigger Button matching Mockup pill style */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-card border border-line text-xs font-semibold text-ink cursor-pointer transition-all hover:border-[#2da482] hover:bg-canvas/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2da482]/20 shadow-2xs",
          open && "border-[#2da482] ring-2 ring-[#2da482]/20 bg-white",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <span className="font-sans font-medium text-ink">{value || "Select time"}</span>
        <Clock
          size={15}
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
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-line bg-card shadow-2xl p-1 font-sans"
            style={{
              boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)",
            }}
          >
            <ClockPicker
              value={value}
              onChange={onChange}
              onClose={() => setOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

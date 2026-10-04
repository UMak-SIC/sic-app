"use client";

import * as React from "react";
import { Clock, Check, Sun, Moon, ArrowCounterClockwise } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface ClockPickerProps {
  value: string; // e.g., "9:00 am" or "09:00 am"
  onChange: (newValue: string) => void;
  onClose?: () => void;
  className?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const COMMON_PRESETS = [
  { label: "8:00 AM", value: "8:00 am" },
  { label: "9:00 AM", value: "9:00 am" },
  { label: "10:30 AM", value: "10:30 am" },
  { label: "1:00 PM", value: "1:00 pm" },
  { label: "2:30 PM", value: "2:30 pm" },
  { label: "5:00 PM", value: "5:00 pm" },
];

export function parseTimeString(timeStr: string) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) {
    return { hour: 9, minute: 0, period: "am" as "am" | "pm" };
  }
  let h = parseInt(match[1], 10);
  if (h < 1) h = 12;
  if (h > 12) h = 12;
  let m = parseInt(match[2], 10);
  if (isNaN(m) || m < 0) m = 0;
  if (m > 59) m = 59;
  const p = (match[3]?.toLowerCase() || "am") as "am" | "pm";
  return { hour: h, minute: m, period: p };
}

export function formatTimeString(hour: number, minute: number, period: "am" | "pm") {
  const mStr = minute < 10 ? `0${minute}` : `${minute}`;
  return `${hour}:${mStr} ${period}`;
}

export function ClockPicker({
  value,
  onChange,
  onClose,
  className,
}: ClockPickerProps) {
  const parsed = React.useMemo(() => parseTimeString(value), [value]);
  const [activeView, setActiveView] = React.useState<"hours" | "minutes">("hours");
  const [hour, setHour] = React.useState(parsed.hour);
  const [minute, setMinute] = React.useState(parsed.minute);
  const [period, setPeriod] = React.useState<"am" | "pm">(parsed.period);

  React.useEffect(() => {
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [parsed]);

  const clockFaceRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const commitTime = (h: number, m: number, p: "am" | "pm") => {
    setHour(h);
    setMinute(m);
    setPeriod(p);
    onChange(formatTimeString(h, m, p));
  };

  // Calculate angle and update hour or minute based on pointer event coordinates
  const handlePointerCalc = (e: React.PointerEvent | MouseEvent | TouchEvent) => {
    if (!clockFaceRef.current) return;
    const rect = clockFaceRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ("touches" in e && (e as TouchEvent).touches.length > 0) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees (0 deg at top 12 o'clock, clockwise)
    let angleRad = Math.atan2(dy, dx);
    let deg = (angleRad * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (activeView === "hours") {
      let selectedHour = Math.round(deg / 30) % 12;
      if (selectedHour === 0) selectedHour = 12;
      commitTime(selectedHour, minute, period);
    } else {
      let selectedMinute = Math.round(deg / 6) % 60;
      commitTime(hour, selectedMinute, period);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointerCalc(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handlePointerCalc(e);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // If user selected an hour, smoothly advance to minutes view
      if (activeView === "hours") {
        setTimeout(() => {
          setActiveView("minutes");
        }, 150);
      }
    }
  };

  // Clock geometry
  const dialRadius = 92; // px radius for numbers
  const currentAngle =
    activeView === "hours"
      ? (hour % 12) * 30
      : (minute % 60) * 6;

  // Selected hand endpoint
  const handRad = ((currentAngle - 90) * Math.PI) / 180;
  const handX = 110 + dialRadius * Math.cos(handRad);
  const handY = 110 + dialRadius * Math.sin(handRad);

  return (
    <div
      className={cn(
        "flex flex-col items-center bg-card rounded-2xl p-4 w-[280px] select-none font-sans text-ink",
        className
      )}
    >
      {/* Top Display: Digital Time with Hour / Minute Tab & AM/PM Selector */}
      <div className="flex items-center justify-between w-full pb-3 border-b border-line-subtle">
        <div className="flex items-baseline gap-1">
          {/* Hour Button */}
          <button
            type="button"
            onClick={() => setActiveView("hours")}
            className={cn(
              "px-2 py-0.5 rounded-lg font-display text-2xl font-bold transition-colors cursor-pointer",
              activeView === "hours"
                ? "bg-[#2da482] text-white shadow-2xs"
                : "text-ink hover:bg-canvas"
            )}
          >
            {hour < 10 ? `0${hour}` : hour}
          </button>
          <span className="font-display text-2xl font-bold text-muted/60">:</span>
          {/* Minute Button */}
          <button
            type="button"
            onClick={() => setActiveView("minutes")}
            className={cn(
              "px-2 py-0.5 rounded-lg font-display text-2xl font-bold transition-colors cursor-pointer",
              activeView === "minutes"
                ? "bg-[#2da482] text-white shadow-2xs"
                : "text-ink hover:bg-canvas"
            )}
          >
            {minute < 10 ? `0${minute}` : minute}
          </button>
        </div>

        {/* AM / PM Selector */}
        <div className="flex items-center p-0.5 rounded-lg bg-canvas border border-line text-xs font-bold">
          <button
            type="button"
            onClick={() => commitTime(hour, minute, "am")}
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
            onClick={() => commitTime(hour, minute, "pm")}
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

      {/* Analog Clock Face Area */}
      <div className="relative my-4 flex items-center justify-center">
        <div
          ref={clockFaceRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative size-[220px] rounded-full bg-canvas/60 dark:bg-canvas/30 border border-line flex items-center justify-center cursor-pointer shadow-inner touch-none"
        >
          {/* Subtle 5-minute tick markers on edge */}
          <svg className="absolute inset-0 size-full pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => {
              const rad = ((i * 6 - 90) * Math.PI) / 180;
              const is5Min = i % 5 === 0;
              const rInner = is5Min ? 102 : 105;
              const rOuter = 108;
              const x1 = 110 + rInner * Math.cos(rad);
              const y1 = 110 + rInner * Math.sin(rad);
              const x2 = 110 + rOuter * Math.cos(rad);
              const y2 = 110 + rOuter * Math.sin(rad);

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={is5Min ? "var(--muted)" : "var(--line)"}
                  strokeWidth={is5Min ? 1.5 : 1}
                  strokeOpacity={is5Min ? 0.4 : 0.25}
                />
              );
            })}
          </svg>

          {/* Clock Hand / Pointer SVG */}
          <svg className="absolute inset-0 size-full pointer-events-none">
            {/* Center Pivot Pin */}
            <circle cx="110" cy="110" r="4" fill="#2da482" />
            {/* Connecting Line to Indicator */}
            <line
              x1="110"
              y1="110"
              x2={handX}
              y2={handY}
              stroke="#2da482"
              strokeWidth="2"
            />
            {/* Pointer Bubble Circle */}
            <circle
              cx={handX}
              cy={handY}
              r="15"
              fill="#2da482"
              className="drop-shadow-xs"
            />
          </svg>

          {/* Clock Dial Numbers */}
          <AnimatePresence mode="wait">
            {activeView === "hours" ? (
              <motion.div
                key="hours-dial"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 size-full pointer-events-none"
              >
                {HOURS.map((h) => {
                  const angle = (h % 12) * 30;
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const x = 110 + dialRadius * Math.cos(rad);
                  const y = 110 + dialRadius * Math.sin(rad);
                  const isSelected = h === hour;

                  return (
                    <div
                      key={h}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={cn(
                        "absolute flex items-center justify-center size-7 rounded-full font-display text-xs font-bold transition-colors",
                        isSelected ? "text-white" : "text-ink"
                      )}
                    >
                      {h}
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="minutes-dial"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 size-full pointer-events-none"
              >
                {MINUTE_STEPS.map((m) => {
                  const angle = (m % 60) * 6;
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const x = 110 + dialRadius * Math.cos(rad);
                  const y = 110 + dialRadius * Math.sin(rad);
                  const isSelected = Math.abs(m - minute) < 2.5;

                  return (
                    <div
                      key={m}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={cn(
                        "absolute flex items-center justify-center size-7 rounded-full font-sans text-[11px] font-semibold transition-colors",
                        isSelected ? "text-white font-bold" : "text-ink"
                      )}
                    >
                      {m < 10 ? `0${m}` : m}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mode Helper & Preset Pills */}
      <div className="w-full pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
            {activeView === "hours" ? "Select Hour" : "Select Minute"}
          </span>
          <button
            type="button"
            onClick={() => setActiveView(activeView === "hours" ? "minutes" : "hours")}
            className="text-[10px] font-bold text-[#2da482] hover:underline cursor-pointer flex items-center gap-1"
          >
            <ArrowCounterClockwise size={10} weight="bold" />
            <span>Switch to {activeView === "hours" ? "Minutes" : "Hours"}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1 mb-3">
          {COMMON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                const p = parseTimeString(preset.value);
                commitTime(p.hour, p.minute, p.period);
              }}
              className="px-2 py-0.5 rounded-md bg-canvas text-[10px] font-medium text-muted hover:text-ink hover:bg-[#2da482]/20 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Done Action */}
      {onClose && (
        <div className="w-full pt-2 border-t border-line-subtle flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-sans text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check size={13} weight="bold" />
            <span>Done</span>
          </button>
        </div>
      )}
    </div>
  );
}

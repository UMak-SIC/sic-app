"use client";

import * as React from "react";
import { GraduationCap, Funnel, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const R = 56;
/** the band's weight — thick enough to read as a band, with room to grow into */
const THICK = 10;
/** what hover adds, radially; the arc keeps its own degrees either way */
const HOT = 3;
/** degrees taken out of a slice, half at each end, capped at half its own span */
const GAP_DEG = 4.5;
/** the tail's colour — neutral UMak ink mix */
const OTHER = "color-mix(in srgb, var(--ink) 25%, transparent)";

export interface CollegeDatum {
  name: string;
  shortName: string;
  value: number;
  color: string;
  amount?: string;
}

export interface EventCollegeDistributionProps {
  data?: CollegeDatum[];
  selectedCollege?: string | null;
  onSelectCollege?: (collegeName: string | null) => void;
  className?: string;
}

const DEFAULT_COLLEGE_DATA: CollegeDatum[] = [
  {
    name: "College of Computing and Information Sciences",
    shortName: "CCIS",
    value: 52,
    color: "var(--cyan, #087f8c)",
    amount: "52 attended",
  },
  {
    name: "College of Business and Financial Science",
    shortName: "CBFS",
    value: 28,
    color: "var(--green, #2da482)",
    amount: "28 attended",
  },
  {
    name: "College of Technology",
    shortName: "CT",
    value: 18,
    color: "var(--amber, #9c6016)",
    amount: "18 attended",
  },
  {
    name: "College of Arts and Letters",
    shortName: "CAL",
    value: 12,
    color: "#1f5963",
    amount: "12 attended",
  },
  {
    name: "Other Colleges",
    shortName: "Other",
    value: 8,
    color: OTHER,
    amount: "8 attended",
  },
];

export function EventCollegeDistribution({
  data = DEFAULT_COLLEGE_DATA,
  selectedCollege = null,
  onSelectCollege,
  className,
}: EventCollegeDistributionProps) {
  const [hot, setHot] = React.useState<string | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const sum = sorted.reduce((s, d) => s + d.value, 0);

  const focus = hot ?? selectedCollege;

  const { segs } = sorted.reduce<{
    acc: number;
    segs: Array<(typeof sorted)[number] & { a0: number; a1: number; frac: number }>;
  }>(
    (res, d) => {
      const frac = sum > 0 ? d.value / sum : 0;
      const span = frac * 360;
      const gap = Math.min(GAP_DEG, span * 0.5);
      const a0 = res.acc * 360 + gap / 2;
      const a1 = (res.acc + frac) * 360 - gap / 2;
      return {
        acc: res.acc + frac,
        segs: [...res.segs, { ...d, a0, a1: Math.max(a1, a0 + 0.5), frac }],
      };
    },
    { acc: 0, segs: [] }
  );

  const arc = (a0: number, a1: number) => {
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x0 = 70 + R * Math.cos(rad(a0));
    const y0 = 70 + R * Math.sin(rad(a0));
    const x1 = 70 + R * Math.cos(rad(a1));
    const y1 = 70 + R * Math.sin(rad(a1));
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${
      a1 - a0 > 180 ? 1 : 0
    } 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  };

  const centred = focus ? segs.find((s) => s.name === focus || s.shortName === focus) : undefined;

  const handleToggleSlice = (name: string) => {
    if (!onSelectCollege) return;
    if (selectedCollege === name) {
      onSelectCollege(null);
    } else {
      onSelectCollege(name);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[12px] border border-line bg-card p-5 shadow-2xs",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-cyan-soft text-cyan">
            <GraduationCap size={16} weight="bold" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-ink">
              College distribution
            </h2>
            <p className="font-sans text-[11px] text-muted">
              Attendees categorized by department
            </p>
          </div>
        </div>

        {selectedCollege && (
          <button
            type="button"
            onClick={() => onSelectCollege?.(null)}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-soft px-2.5 py-0.5 font-sans text-[11px] font-semibold text-cyan hover:bg-cyan-muted cursor-pointer transition-colors"
            title="Clear college filter"
          >
            <Funnel size={12} weight="bold" />
            <span>Filtered: {selectedCollege}</span>
            <X size={12} weight="bold" />
          </button>
        )}
      </div>

      {/* Stacked Layout: Pie ring at the TOP, legend stacked UNDERNEATH */}
      <div className="flex flex-col items-center gap-5 my-auto py-2">
        {/* Ring Chart at the Top */}
        <div className="relative shrink-0">
          <svg
            width="150"
            height="150"
            viewBox="0 0 140 140"
            role="img"
            aria-label={segs
              .map((s) => `${s.shortName} ${(s.frac * 100).toFixed(1)}%`)
              .join(", ")}
          >
            {segs.map((s) => (
              <g key={s.name}>
                {/* Hit area */}
                <path
                  aria-hidden="true"
                  d={arc(s.a0, s.a1)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={THICK + 12}
                  onMouseEnter={() => setHot(s.name)}
                  onMouseLeave={() => setHot(null)}
                  onClick={() => handleToggleSlice(s.shortName)}
                  className="cursor-pointer"
                />
                {/* Visual Arc */}
                <path
                  aria-hidden="true"
                  pointerEvents="none"
                  d={arc(s.a0, s.a1)}
                  fill="none"
                  stroke={s.color}
                  strokeLinecap="butt"
                  strokeWidth={
                    focus === s.name || focus === s.shortName ? THICK + HOT : THICK
                  }
                  opacity={
                    focus && focus !== s.name && focus !== s.shortName ? 0.35 : 1
                  }
                  className="transition-all duration-200"
                />
              </g>
            ))}
          </svg>

          {/* Centered Total / Focused Info */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center text-center px-2">
              <span className="font-sans text-[10px] font-medium text-muted uppercase tracking-wider truncate max-w-[90px]">
                {centred ? centred.shortName : "Total"}
              </span>
              <span className="font-display text-xl font-bold text-ink tabular-nums">
                {centred ? centred.value : sum}
              </span>
              <span className="font-sans text-[10px] text-muted">
                attended
              </span>
            </div>
          </div>
        </div>

        {/* Legend Stacked Underneath the Pie */}
        <div className="flex w-full flex-col gap-1">
          {segs.map((s) => {
            const on = selectedCollege === s.shortName || selectedCollege === s.name;
            const isHovered = focus === s.name || focus === s.shortName;

            return (
              <button
                key={s.name}
                type="button"
                onClick={() => handleToggleSlice(s.shortName)}
                aria-pressed={on}
                onMouseEnter={() => setHot(s.name)}
                onMouseLeave={() => setHot(null)}
                onFocus={() => setHot(s.name)}
                onBlur={() => setHot(null)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[6px] px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer",
                  on ? "bg-cyan-soft/50 ring-1 ring-cyan-border" : "hover:bg-canvas/60"
                )}
                style={{
                  opacity: focus && !isHovered ? 0.45 : 1,
                  transitionTimingFunction: `cubic-bezier(${EASE.join(",")})`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3.5 w-1.5 shrink-0 rounded-[2px]"
                    style={{ background: s.color }}
                  />
                  <span className="truncate font-sans text-xs font-semibold text-ink">
                    {s.shortName}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans text-xs font-medium text-muted tabular-nums">
                    {(s.frac * 100).toFixed(0)}%
                  </span>
                  <span className="font-sans text-xs font-medium text-ink tabular-nums w-20 text-right">
                    {s.value} attended
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-3 border-t border-line-subtle pt-2.5 text-center sm:text-left">
        <span className="font-sans text-[10.5px] text-muted">
          Tip: Click any college above to filter the student roster below.
        </span>
      </div>
    </div>
  );
}

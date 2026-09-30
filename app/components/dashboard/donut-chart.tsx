"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const SANS = "inherit";
const TEXT = "var(--foreground)";
const TEXT_MUTED = "var(--muted-foreground)";

const CX = 105;
const CY = 105;
const R = 80;
/** the band's weight — thick enough to read prominently as a donut slice */
const THICK = 16;
/** what hover adds, radially; the arc keeps its own degrees either way */
const HOT = 4;
/** degrees taken out of a slice, half at each end, capped at half its own span */
const GAP_DEG = 3.5;
/** the tail's colour — the house neutral, so it reads as "the rest", not a hue */
const OTHER = "color-mix(in srgb, var(--foreground) 22%, transparent)";

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
  /** trailing figure on the legend row — the amount the share is a share of */
  amount?: string;
}

export interface DonutChartProps {
  data?: DonutDatum[];
  /** centre figure when nothing is hovered */
  total?: string;
  /** what the centre calls that figure */
  label?: string;
  /** ring and legend side by side, or legend stacked under the ring for a rail */
  layout?: "row" | "stacked";
  /** the picked slice's name — dims every other slice, ring and legend alike */
  selected?: string | null;
  /** given, the legend rows become toggles and the chart becomes the control */
  onSelect?: (name: string) => void;
  /** optional value formatter for slice hover */
  formatValue?: (value: number) => string;
  className?: string;
}

const DEFAULT_SLICES: DonutDatum[] = [
  { name: "CCIS", value: 88, color: "var(--cyan, #087f8c)", amount: "88 std" },
  { name: "CBFS", value: 62, color: "var(--green, #2da482)", amount: "62 std" },
  { name: "CAL", value: 42, color: "#176c59", amount: "42 std" },
  { name: "COE", value: 30, color: "var(--amber, #9c6016)", amount: "30 std" },
  { name: "CCJ", value: 16, color: "#607579", amount: "16 std" },
  { name: "Other · UMak", value: 12, color: OTHER, amount: "12 std" },
];

const DEFAULT_TOTAL = DEFAULT_SLICES.reduce((s, d) => s + d.value, 0);

export function DonutChart({
  data = DEFAULT_SLICES,
  total = `${DEFAULT_TOTAL}`,
  label = "Total",
  layout = "row",
  selected = null,
  onSelect,
  formatValue,
  className,
}: DonutChartProps) {
  const [hot, setHot] = useState<string | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const sum = sorted.reduce((s, d) => s + d.value, 0);

  /* one focus at a time: the pointer wins while it is over the chart, otherwise
     the picked slice is what the ring and the centre answer about */
  const focus = hot ?? selected;

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
    const x0 = CX + R * Math.cos(rad(a0));
    const y0 = CY + R * Math.sin(rad(a0));
    const x1 = CX + R * Math.cos(rad(a1));
    const y1 = CY + R * Math.sin(rad(a1));
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  };

  const centred = focus ? segs.find((s) => s.name === focus) : undefined;

  const ring = (
    <div className="relative shrink-0">
      <svg
        width="210"
        height="210"
        viewBox="0 0 210 210"
        role="img"
        aria-label={segs.map((s) => `${s.name} ${(s.frac * 100).toFixed(1)}%`).join(", ")}
      >
        {segs.map((s) => (
          <g key={s.name}>
            {/* Wider invisible hit area for easy hover/clicking */}
            <path
              aria-hidden
              d={arc(s.a0, s.a1)}
              fill="none"
              stroke="transparent"
              strokeWidth={THICK + 14}
              onMouseEnter={() => setHot(s.name)}
              onMouseLeave={() => setHot(null)}
              onClick={onSelect ? () => onSelect(s.name) : undefined}
              className={onSelect ? "cursor-pointer" : undefined}
            />
            {/* Visual Arc Band */}
            <path
              aria-hidden
              pointerEvents="none"
              d={arc(s.a0, s.a1)}
              fill="none"
              stroke={s.color}
              strokeLinecap="butt"
              strokeWidth={focus === s.name ? THICK + HOT : THICK}
              opacity={focus && focus !== s.name ? 0.3 : 1}
              className="transition-all duration-200"
            />
          </g>
        ))}
      </svg>
      {/* Center KPI Information */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center text-center px-2">
          <span
            className="text-xs font-sans font-medium max-w-[110px] truncate"
            style={{ color: TEXT_MUTED }}
          >
            {centred ? centred.name : label}
          </span>
          <span
            className="text-2xl font-display font-bold tabular-nums leading-tight"
            style={{ color: TEXT }}
          >
            {centred
              ? formatValue
                ? formatValue(centred.value)
                : centred.amount ?? centred.value.toString()
              : total}
          </span>
          {centred && (
            <span
              className="text-[11px] font-sans font-semibold tabular-nums mt-0.5"
              style={{ color: centred.color }}
            >
              {(centred.frac * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const legend = (
    <div
      className={
        layout === "stacked"
          ? "flex w-full flex-col gap-1"
          : "flex flex-col gap-1 w-full sm:w-[235px] sm:max-w-[235px] shrink-0"
      }
    >
      {segs.map((s) => {
        const on = selected === s.name;
        return (
          <button
            key={s.name}
            type="button"
            onClick={onSelect ? () => onSelect(s.name) : undefined}
            aria-pressed={onSelect ? on : undefined}
            onMouseEnter={() => setHot(s.name)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(s.name)}
            onBlur={() => setHot(null)}
            className={
              layout === "stacked"
                ? `flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-150 ${onSelect ? "hover:bg-foreground/[0.03] cursor-pointer" : ""} ${on ? "bg-foreground/[0.05]" : ""}`
                : `flex items-center justify-between gap-1.5 text-left rounded-md px-2 py-1 transition-colors duration-150 ${onSelect ? "hover:bg-slate-100/80 cursor-pointer" : "hover:bg-slate-50"} ${on ? "bg-slate-100" : ""}`
            }
            style={{
              opacity: focus && focus !== s.name ? 0.35 : 1,
              transitionTimingFunction: `cubic-bezier(${EASE.join(",")})`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3.5 w-1.5 shrink-0 rounded-[2px]"
                style={{ background: s.color }}
              />
              <span
                className="truncate text-xs font-semibold"
                style={{ color: TEXT }}
                title={s.name}
              >
                {s.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] tabular-nums font-normal" style={{ color: TEXT_MUTED }}>
                {(s.frac * 100).toFixed(1)}%
              </span>
              {s.amount && (
                <span
                  className="w-12 text-right text-xs tabular-nums font-semibold"
                  style={{ color: TEXT }}
                >
                  {s.amount}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        layout === "stacked"
          ? "flex w-full flex-col items-center gap-4"
          : "flex flex-col sm:flex-row items-center justify-around gap-6 w-full",
        className
      )}
      style={{ fontFamily: SANS }}
    >
      {ring}
      {legend}
    </div>
  );
}

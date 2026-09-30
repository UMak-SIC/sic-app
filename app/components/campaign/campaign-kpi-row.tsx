"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { PaperPlaneTilt, HourglassMedium, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYAN = "var(--cyan)";
const GREEN = "var(--green)";
const AMBER = "var(--amber)";
const RED = "var(--red)";

export type KpiItem = {
  label: string;
  data: number[];
  format?: (v: number) => string;
  delta?: string;
  up?: boolean;
  color?: string;
  icon?: React.ReactNode;
};

export interface KpiCardRowProps {
  items?: KpiItem[];
  labels?: string[];
  className?: string;
}

const DEFAULT_ITEMS: KpiItem[] = [
  {
    label: "Delivered Emails",
    icon: <PaperPlaneTilt size={18} weight="bold" />,
    color: GREEN,
    format: (v) => `${Math.round(v)}`,
    delta: "+18.2%",
    up: true,
    data: [42, 58, 65, 76, 82, 91, 95, 102, 106, 109],
  },
  {
    label: "Currently Sending",
    icon: <HourglassMedium size={18} weight="bold" />,
    color: AMBER,
    format: (v) => `${Math.round(v)}`,
    delta: "-4 queued",
    up: true,
    data: [24, 20, 18, 15, 12, 10, 8, 7, 6, 6],
  },
  {
    label: "Needs Attention",
    icon: <WarningCircle size={18} weight="bold" />,
    color: RED,
    format: (v) => `${Math.round(v)}`,
    delta: "-2 invalid",
    up: true,
    data: [8, 7, 6, 5, 5, 4, 4, 3, 3, 3],
  },
];

const DEFAULT_LABELS = [
  "Oct 5",
  "Oct 6",
  "Oct 7",
  "Oct 8",
  "Oct 9",
  "Oct 10",
  "Oct 11",
  "Oct 12",
  "Oct 13",
  "Oct 14",
];

const W = 300;
const H = 84;
const TOP = 8;
const BOT = 4;

const fallbackFormat = (v: number) =>
  Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(1);

function KpiSpark({
  data,
  color,
  format,
  labels,
}: {
  data: number[];
  color: string;
  format: (v: number) => string;
  labels: string[];
}) {
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/:/g, "");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [hi, setHi] = React.useState<number | null>(null);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1e-6, max - min);
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * W;
  const y = (v: number) => TOP + (1 - (v - min) / span) * (H - TOP - BOT);
  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  const onMove = (e: React.PointerEvent) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHi(
      Math.max(0, Math.min(data.length - 1, Math.round((px / W) * (data.length - 1))))
    );
  };

  const lp = hi === null ? 0 : Math.max(15, Math.min(85, (x(hi) / W) * 100));

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden block"
      onPointerMove={onMove}
      onPointerLeave={() => setHi(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full h-[88px]"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={`kpi-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#kpi-${uid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.5, ease: EASE, delay: 0.55 }
          }
        />
        <motion.path
          d={line}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.9, ease: EASE }
          }
        />
        {hi !== null && (
          <g>
            <line
              x1={x(hi)}
              y1={2}
              x2={x(hi)}
              y2={H}
              stroke="var(--ink)"
              strokeOpacity={0.25}
              strokeWidth="1.2"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(hi)}
              cy={y(data[hi])}
              r="4.5"
              fill={color}
              stroke="var(--paper)"
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>
      {hi !== null && (
        <div
          className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-[6px] px-2.5 py-1 text-center bg-card/95 border border-line shadow-xs backdrop-blur-xs z-10"
          style={{
            left: `${lp}%`,
          }}
        >
          <div className="text-[11px] font-bold tabular-nums text-ink font-display">
            {format(data[hi])}
          </div>
          {labels[hi] && (
            <div className="text-[9px] tabular-nums text-muted font-sans font-medium">
              {labels[hi]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  item,
  labels,
  delay,
}: {
  item: KpiItem;
  labels: string[];
  delay: number;
}) {
  const reduced = useReducedMotion();
  const data = item.data.length ? item.data : [0];
  const format = item.format ?? fallbackFormat;
  const color = item.color ?? CYAN;
  const target = data[data.length - 1];

  const [v, setV] = React.useState(target);
  const shown = React.useRef(target);

  React.useEffect(() => {
    if (reduced) return;
    shown.current = 0;
    setV(0);
    const controls = animate(0, target, {
      duration: 1.1,
      delay,
      ease: EASE,
      onUpdate: (n) => {
        shown.current = n;
        setV(n);
      },
    });
    return () => controls.stop();
  }, [target, delay, reduced]);

  const spark = React.useMemo(
    () => (
      <KpiSpark data={data} color={color} format={format} labels={labels} />
    ),
    [data, color, format, labels]
  );

  return (
    <div className="relative flex-1 min-w-0 w-full overflow-hidden rounded-[16px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-cyan/50 hover:shadow-sm">
      <div className="p-4 sm:p-5 pb-0">
        <div className="flex items-center gap-2 text-sm text-muted">
          {item.icon && (
            <span aria-hidden className="flex text-ink shrink-0">
              {item.icon}
            </span>
          )}
          <span className="text-sm font-semibold text-ink/85 font-sans">
            {item.label}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2.5">
          <span
            className="tabular-nums text-3xl sm:text-4xl font-extrabold font-display text-ink tracking-tight"
            style={{ lineHeight: 1 }}
          >
            {format(v)}
          </span>
          {item.delta && (
            <span
              className="tabular-nums text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  item.color === RED
                    ? "var(--red-soft)"
                    : item.color === AMBER
                    ? "var(--amber-soft)"
                    : "var(--green-soft)",
                color: item.color ?? GREEN,
              }}
            >
              {item.delta}
            </span>
          )}
        </div>
      </div>
      <div className="w-full mt-2 overflow-hidden">{spark}</div>
    </div>
  );
}

export function KpiCardRow({
  items = DEFAULT_ITEMS,
  labels = DEFAULT_LABELS,
  className,
}: KpiCardRowProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4 w-full", className)}>
      {items.map((item, i) => (
        <KpiCard
          key={item.label}
          item={item}
          labels={labels}
          delay={i * 0.12}
        />
      ))}
    </div>
  );
}

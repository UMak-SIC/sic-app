"use client";
import * as React from "react";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkle, X, CheckCircle, Warning, Info, ArrowCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface AlertItem {
  id: string;
  type: "success" | "warning" | "info" | "neutral";
  message: string;
}

export interface AttendeeAlertStackProps {
  alerts?: (string | AlertItem)[];
  onDismiss?: (alert: string) => void;
  className?: string;
}

const DEFAULT_ALERTS = [
  "Roster formatting preview is ready",
  "Duplicate student detection active",
  "Email delivery quota verified",
];

const STYLES = {
  success: {
    text: "text-green",
    badge: "border-green/30 bg-green-soft/50",
    Icon: CheckCircle,
  },
  warning: {
    text: "text-amber",
    badge: "border-amber/30 bg-amber-soft/50",
    Icon: Warning,
  },
  info: {
    text: "text-cyan",
    badge: "border-cyan/30 bg-cyan-soft/50",
    Icon: Info,
  },
  neutral: {
    text: "text-muted",
    badge: "border-line bg-canvas/60",
    Icon: Sparkle,
  },
} as const;

/**
 * Collapsed notification deck: rows sit stacked with a
 * peeking edge, fan open on hover, and each dismiss re-settles the pile.
 * Dismiss everything and a quiet restore control appears.
 */
export function AttendeeAlertStack({
  alerts = DEFAULT_ALERTS,
  onDismiss,
  className,
}: AttendeeAlertStackProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const initialRows: AlertItem[] = React.useMemo(() => {
    return alerts.map((a, idx) => {
      if (typeof a === "string") {
        return { id: `alert-${idx}-${a}`, type: "neutral", message: a };
      }
      return a;
    });
  }, [alerts]);

  const [prevAlerts, setPrevAlerts] = useState(alerts);
  const [rows, setRows] = useState<AlertItem[]>(initialRows);

  if (prevAlerts !== alerts) {
    setPrevAlerts(alerts);
    setRows(initialRows);
  }

  if (rows.length === 0 && initialRows.length === 0) return null;

  return (
    <div
      className={cn("w-full max-w-md", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => setRows(initialRows)}
          className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted hover:text-ink hover:bg-canvas transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowCounterClockwise size={13} weight="bold" />
          <span>Restore alerts</span>
        </button>
      ) : (
        <div
          className="relative transition-all duration-200"
          style={{
            height: open ? rows.length * 48 : 42 + Math.min(rows.length - 1, 3) * 6,
          }}
        >
          <AnimatePresence initial={false}>
            {rows.map((row, i) => {
              const style = STYLES[row.type] || STYLES.neutral;
              const Icon = style.Icon;
              return (
                <motion.div
                  key={row.id || row.message}
                  className={cn(
                    "absolute inset-x-0 top-0 flex h-10 items-center gap-2.5 rounded-[9px] border bg-card px-3.5 shadow-sm transition-colors",
                    open ? "border-line hover:border-line/90" : "border-line/70"
                  )}
                  style={{
                    zIndex: rows.length - i,
                    boxShadow: "0 8px 20px -8px rgba(0,0,0,0.08)",
                  }}
                  initial={false}
                  animate={{
                    y: open ? i * 48 : i * 6,
                    scale: open ? 1 : 1 - i * 0.03,
                    opacity: open ? 1 : i > 2 ? 0 : 1 - i * 0.15,
                  }}
                  exit={{
                    opacity: 0,
                    x: 24,
                    filter: "blur(2px)",
                    transition: {
                      duration: reduced ? 0 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 320, damping: 28 }
                  }
                >
                  <Icon size={15} weight="bold" className={cn("shrink-0", style.text)} />
                  <span className="flex-1 truncate font-sans text-xs font-medium text-ink">
                    {row.message}
                  </span>
                  <button
                    type="button"
                    aria-label={`Dismiss "${row.message}"`}
                    onClick={() => {
                      setRows((r) => r.filter((x) => x.id !== row.id));
                      onDismiss?.(row.message);
                    }}
                    className="rounded p-1 text-muted hover:text-ink hover:bg-canvas transition-colors duration-150 cursor-pointer"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Named alias for AlertStack
export const AlertStack = AttendeeAlertStack;

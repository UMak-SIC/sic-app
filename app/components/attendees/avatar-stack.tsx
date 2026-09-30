"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface EventBadgeItem {
  id: string;
  title: string;
  shortCode: string;
  date: string;
  attended: boolean;
}

export interface AvatarStackProps {
  names?: string[];
  events?: EventBadgeItem[];
  /** Avatar image per item (same order); a missing entry falls back to initials/shortcode. */
  images?: (string | undefined)[];
  /** Coins shown before folding the rest into a "+N" count. */
  max?: number;
  className?: string;
}

/** Initials-fallback coin faces — a tint of the chart ramp over the card surface,
 * so the four faces stay distinguishable in either theme without a fixed hex. */
const COIN_BG = [
  "color-mix(in srgb, var(--chart-1) 18%, var(--card))",
  "color-mix(in srgb, var(--chart-5) 18%, var(--card))",
  "color-mix(in srgb, var(--chart-2) 18%, var(--card))",
  "color-mix(in srgb, var(--chart-3) 18%, var(--card))",
];

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Floating label above a coin or the overflow chip — never widens the row. */
function Tooltip({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className="pointer-events-none absolute -top-7 left-1/2 z-50 whitespace-nowrap rounded-[6px] border px-2 py-0.5 font-sans text-[10px] font-semibold text-foreground/90 shadow-sm"
      style={{
        background: "var(--card)",
        borderColor: "color-mix(in srgb, var(--foreground) 10%, transparent)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      }}
      initial={{ opacity: 0, y: reduced ? 0 : 3, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: reduced ? 0 : 3, x: "-50%" }}
      transition={reduced ? { duration: 0 } : { duration: 0.15 }}
    >
      {children}
    </motion.span>
  );
}

function Coin({
  name,
  label,
  img,
  z,
  lifted,
  isAttended,
  onHover,
}: {
  name: string;
  label?: string;
  img?: string;
  z: number;
  lifted: boolean;
  isAttended?: boolean;
  onHover: (v: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const displayLabel = label || initials(name);

  return (
    <motion.span
      className={cn(
        "relative inline-grid h-6 w-6 place-items-center rounded-full font-sans text-[9px] font-bold select-none cursor-pointer transition-shadow",
        isAttended === true && "ring-1 ring-green/60 text-green",
        isAttended === false && "text-muted",
        isAttended === undefined && "text-foreground/80"
      )}
      style={{
        background: COIN_BG[z % COIN_BG.length],
        boxShadow: "0 0 0 2px var(--card, #fff)",
        zIndex: lifted ? 50 : z,
      }}
      animate={{ y: lifted && !reduced ? -5 : 0 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {img ? (
        <img src={img} alt={name} className="h-full w-full rounded-full object-cover" draggable={false} />
      ) : (
        displayLabel
      )}
      <AnimatePresence>{lifted && <Tooltip>{name}</Tooltip>}</AnimatePresence>
    </motion.span>
  );
}

/**
 * Overlapping gradient-orb coins with a surface ring so each stays legible.
 * Hovering a coin lifts it out of the stack and floats its name; hovering the
 * "+N" chip floats the hidden names above it — the stack itself never widens.
 * Supports both raw `names` or event badge records `events`.
 */
export function AvatarStack({
  names,
  events,
  images = [],
  max = 4,
  className,
}: AvatarStackProps) {
  const reduced = useReducedMotion();
  const [hot, setHot] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);

  // Derive items from either `events` or `names`
  const items: { id: string; name: string; label?: string; isAttended?: boolean; img?: string }[] =
    events && events.length > 0
      ? events.map((e, idx) => ({
          id: e.id,
          name: `${e.title}${e.date ? ` (${e.date})` : ""}`,
          label: e.shortCode || initials(e.title),
          isAttended: e.attended,
          img: images[idx],
        }))
      : (names || []).map((n, idx) => ({
          id: `${n}-${idx}`,
          name: n,
          label: initials(n),
          img: images[idx],
        }));

  if (items.length === 0) {
    return (
      <span className="font-sans text-[11px] text-muted-light italic select-none">
        No events
      </span>
    );
  }

  const shown = items.slice(0, max);
  const hidden = items.slice(max);

  return (
    <span
      className={cn("inline-flex items-center", className)}
      onMouseLeave={() => {
        setPeek(false);
        setHot(null);
      }}
    >
      <span className="flex -space-x-1.5 py-1">
        {shown.map((item, i) => (
          <Coin
            key={item.id}
            name={item.name}
            label={item.label}
            img={item.img}
            z={shown.length - i}
            lifted={hot === item.id}
            isAttended={item.isAttended}
            onHover={(v) => setHot(v ? item.id : null)}
          />
        ))}
      </span>
      {hidden.length > 0 && (
        <motion.span
          className="relative ml-2 cursor-pointer font-sans text-[11px] font-bold text-foreground/50 hover:text-foreground/90 transition-colors"
          onMouseEnter={() => setPeek(true)}
          onMouseLeave={() => setPeek(false)}
          whileHover={reduced ? undefined : { y: -2 }}
        >
          +{hidden.length}
          <AnimatePresence>
            {peek && (
              <Tooltip>
                {hidden.map((h) => h.name.split(" (")[0]).join(" · ")}
              </Tooltip>
            )}
          </AnimatePresence>
        </motion.span>
      )}
    </span>
  );
}

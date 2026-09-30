/**
 * ProfileCircle — Gradient avatar initials circle for a student/person.
 * Sizes: "sm" (24px) | "md" (32px) | "lg" (40px) | "xl" (48px)
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const GRADIENT_PALETTES = [
  // 1: Emerald & Cyan Glow (UMak primary vibe)
  {
    background: "linear-gradient(135deg, #2da482 0%, #087f8c 100%)",
    color: "#ffffff",
    border: "rgba(45, 164, 130, 0.3)",
    shadow: "0 2px 8px -1px rgba(45, 164, 130, 0.35)",
  },
  // 2: Cyan & Deep Ink Teal
  {
    background: "linear-gradient(135deg, #087f8c 0%, #12333a 100%)",
    color: "#ffffff",
    border: "rgba(8, 127, 140, 0.3)",
    shadow: "0 2px 8px -1px rgba(8, 127, 140, 0.35)",
  },
  // 3: Warm Amber & Ochre
  {
    background: "linear-gradient(135deg, #d98d2b 0%, #9c6016 100%)",
    color: "#ffffff",
    border: "rgba(217, 141, 43, 0.3)",
    shadow: "0 2px 8px -1px rgba(217, 141, 43, 0.35)",
  },
  // 4: Rose & Crimson Soft
  {
    background: "linear-gradient(135deg, #d95d6b 0%, #a43d49 100%)",
    color: "#ffffff",
    border: "rgba(217, 93, 107, 0.3)",
    shadow: "0 2px 8px -1px rgba(217, 93, 107, 0.35)",
  },
  // 5: Deep Forest & Emerald
  {
    background: "linear-gradient(135deg, #176c59 0%, #29a388 100%)",
    color: "#ffffff",
    border: "rgba(23, 108, 89, 0.3)",
    shadow: "0 2px 8px -1px rgba(23, 108, 89, 0.35)",
  },
  // 6: Deep Ink & Teal Slate
  {
    background: "linear-gradient(135deg, #12333a 0%, #22434a 100%)",
    color: "#ffffff",
    border: "rgba(18, 51, 58, 0.3)",
    shadow: "0 2px 8px -1px rgba(18, 51, 58, 0.35)",
  },
];

function pickPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_PALETTES[Math.abs(hash) % GRADIENT_PALETTES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE = {
  sm: "size-6 text-[9px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-xs",
  xl: "size-12 text-sm",
} as const;

export interface ProfileCircleProps {
  name: string;
  image?: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function ProfileCircle({ name, image, size = "md", className }: ProfileCircleProps) {
  const palette = pickPalette(name || "Student");

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-line select-none",
          SIZE[size],
          className
        )}
        draggable={false}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-sans font-bold leading-none select-none ring-1 ring-white/10 overflow-hidden shadow-2xs transition-transform duration-150",
        SIZE[size],
        className
      )}
      style={{
        background: palette.background,
        color: palette.color,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.35), ${palette.shadow}`,
        borderColor: palette.border,
      }}
      title={name}
    >
      <span className="relative z-10 tracking-wider drop-shadow-xs">{initials(name)}</span>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent rounded-full" />
    </div>
  );
}

"use client";

import * as React from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "readiness", label: "Readiness" },
  { id: "activity", label: "Activity" },
  { id: "roster", label: "Roster" },
] as const;

function computeActiveId(): string {
  if (typeof document === "undefined") return SECTIONS[0].id;
  const doc = document.documentElement;
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
    return SECTIONS[SECTIONS.length - 1].id;
  }
  const line = window.innerHeight * 0.25;
  let active: string = SECTIONS[0].id;
  for (const section of SECTIONS) {
    const el = document.getElementById(section.id);
    if (el && el.getBoundingClientRect().top <= line) active = section.id;
  }
  return active;
}

export function EventSectionNav() {
  const [activeId, setActiveId] = React.useState<string>(SECTIONS[0].id);
  const activeRef = React.useRef<string>(SECTIONS[0].id);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", () => {
    const next = computeActiveId();
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActiveId(next);
    }
  });

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    activeRef.current = id;
    setActiveId(id);
  };

  return (
    <nav
      aria-label="Event sections"
      className="sticky top-0 z-10 flex border-b border-line-subtle bg-paper/90 backdrop-blur"
    >
      <ul className="flex items-center gap-1 py-1.5">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeId === section.id ? "true" : undefined}
              onClick={(event) => handleClick(event, section.id)}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3.5 font-sans text-sm transition-colors cursor-pointer",
                activeId === section.id
                  ? "bg-ink font-semibold text-paper"
                  : "text-muted hover:bg-canvas hover:text-ink"
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

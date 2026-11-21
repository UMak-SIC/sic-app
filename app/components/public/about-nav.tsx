"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// The About sub-menu (PS-03.1). Each part also has its own address (PS-03.2).
const ABOUT_PARTS = [
  { href: "/about", label: "Mission, Vision and History" },
  { href: "/about/adviser", label: "Adviser" },
  { href: "/about/executive-committee", label: "Executive Committee" },
  { href: "/about/committees", label: "Committees" },
  { href: "/about/achievements", label: "Achievements" },
] as const;

export function AboutNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="About" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {ABOUT_PARTS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                  active
                    ? "border-cyan bg-cyan text-paper"
                    : "border-line bg-paper text-ink hover:border-cyan-border hover:bg-cyan-muted",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

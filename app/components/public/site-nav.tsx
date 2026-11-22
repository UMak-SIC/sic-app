"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";

import { isInSection, PUBLIC_SECTIONS } from "@/lib/public-site/sections";
import { cn } from "@/lib/utils";

// The header navigation (PS-01.2, PS-01.6, PS-01.7). One line of links from xl
// up; below that, a menu button opens the same links. The menu works by touch
// and keyboard, closes when a link is chosen or Escape is pressed, and returns
// focus to the button.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

type SiteNavProps = { signedIn: boolean };

function AccountLink({ signedIn, className }: SiteNavProps & { className?: string }) {
  return (
    <Link
      href={signedIn ? "/apps" : "/login"}
      className={cn(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-cyan-border hover:bg-cyan-muted active:scale-[0.98]",
        focusRing,
        className,
      )}
    >
      {signedIn ? "Dashboard" : "Sign in"}
    </Link>
  );
}

export function SiteNav({ signedIn }: SiteNavProps) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden xl:flex items-center gap-1">
        {PUBLIC_SECTIONS.map(({ href, label }) => {
          const active = isInSection(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap rounded-[6px] px-2.5 py-2 text-sm font-medium transition-colors",
                active ? "text-cyan" : "text-ink hover:text-cyan",
                focusRing,
              )}
            >
              {label}
              {active ? (
                <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-[13px] h-0.5 rounded-full bg-cyan" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="hidden xl:block">
        <AccountLink signedIn={signedIn} />
      </div>

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "xl:hidden inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink active:scale-[0.98]",
          focusRing,
        )}
      >
        {open ? <X size={18} aria-hidden="true" /> : <List size={18} aria-hidden="true" />}
        Menu
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="xl:hidden absolute inset-x-0 top-full border-b border-line bg-paper shadow-[0_18px_36px_-18px_rgba(18,51,58,0.18)]"
      >
        <nav aria-label="Main" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PUBLIC_SECTIONS.map(({ href, label }, index) => {
              const active = isInSection(pathname, href);
              return (
                <li key={href}>
                  <Link
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center rounded-[9px] px-3 text-base font-medium",
                      active ? "bg-cyan-soft text-cyan" : "text-ink hover:bg-cyan-muted",
                      focusRing,
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-line-subtle pt-4">
            <AccountLink signedIn={signedIn} className="w-full" />
          </div>
        </nav>
      </div>
    </>
  );
}

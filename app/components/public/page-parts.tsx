import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

// Small building blocks shared by the public pages.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
        {title}
      </h1>
      {intro ? <p className="max-w-[65ch] text-base leading-relaxed text-muted">{intro}</p> : null}
    </div>
  );
}

/** The page width and spacing every public page uses. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 md:py-14", className)}>
      {children}
    </div>
  );
}

/** A plain message where content would be (every "plain message" criterion). */
export function EmptyState({ icon: StateIcon, message }: { icon: Icon; message: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-dashed border-line bg-paper px-5 py-6">
      <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-soft text-cyan">
        <StateIcon size={24} />
      </span>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
    </div>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl font-bold tracking-tight">
      {children}
    </h2>
  );
}

/** Previous and next page links for long lists (PS-06.3). */
export function Pager({
  page,
  pageCount,
  hrefFor,
  label,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (pageCount <= 1) return null;
  const linkClass = cn(
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted",
    focusRing,
  );
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          <CaretLeft size={16} aria-hidden="true" />
          Newer
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          Older
          <CaretRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** A page number from the address, kept within range. */
export function pageFromParam(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Initials for a member without a photo (PS-11.3). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

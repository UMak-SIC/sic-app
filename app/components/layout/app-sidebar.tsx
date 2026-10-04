"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SidebarSimple } from "@phosphor-icons/react";
import { SidebarNav } from "./sidebar-nav";
import { SidebarPromoCard } from "./sidebar-promo-card";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col border-r border-line bg-paper transition-all duration-300 ease-in-out h-[100dvh] max-h-[100dvh] sticky top-0 self-start shrink-0 overflow-hidden",
        collapsed ? "w-18" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex h-20 items-center border-b border-slate-100 transition-all duration-200 shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {/* Brand Logo & Name (Completely hidden when collapsed) */}
        {!collapsed && (
          <Link
            href="/overview"
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <Image
                src="/sic_logo_nobg.png"
                alt="UMak SIC Logo"
                width={38}
                height={38}
                className="h-auto w-auto object-contain max-h-10 max-w-10"
                priority
              />
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold font-display tracking-tight text-slate-900 leading-tight">
                UMAK SIC
              </span>
              <span className="text-[11px] font-semibold text-slate-400 leading-none tracking-wide">
                CCIS
              </span>
            </div>
          </Link>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-slate-200/60 shadow-2xs cursor-pointer shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarSimple size={18} weight="bold" />
        </button>
      </div>

      {/* Navigation Sections */}
      <SidebarNav collapsed={collapsed} />

      {/* Promo Card (hidden when collapsed) */}
      {!collapsed && (
        <div className="shrink-0 mt-auto">
          <SidebarPromoCard />
        </div>
      )}
    </aside>
  );
}

export function MobileSidebarContent({
  onClose,
}: {
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-paper w-full">
      {/* Brand Header */}
      <div className="flex h-18 items-center justify-between border-b border-line px-5">
        <Link
          href="/overview"
          onClick={onClose}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <Image
              src="/sic_logo_nobg.png"
              alt="UMak SIC Logo"
              width={34}
              height={34}
              className="h-auto w-auto object-contain max-h-9 max-w-9"
              priority
            />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold font-display tracking-tight text-ink leading-tight">
              UMAK SIC
            </span>
            <span className="text-[11px] font-semibold text-muted leading-none tracking-wide">
              CCIS Operations
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <SidebarNav collapsed={false} onItemClick={onClose} />

      {/* Promo Card */}
      <div className="p-3">
        <SidebarPromoCard />
      </div>
    </div>
  );
}


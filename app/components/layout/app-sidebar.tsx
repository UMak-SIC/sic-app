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
        "relative flex flex-col border-r border-line bg-paper transition-all duration-300 ease-in-out h-screen sticky top-0 shrink-0 overflow-x-hidden",
        collapsed ? "w-18" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex h-20 items-center border-b border-slate-100 transition-all duration-200",
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
      {!collapsed && <SidebarPromoCard />}
    </aside>
  );
}

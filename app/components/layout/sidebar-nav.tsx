"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarNavSections } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  collapsed?: boolean;
}

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 px-2.5 py-4 overflow-y-auto">
      {sidebarNavSections.map((section, idx) => (
        <div key={section.title || idx} className="space-y-1.5">
          {section.title && !collapsed && (
            <h3 className="px-3 text-[11px] tracking-wider text-muted uppercase">
              {section.title}
            </h3>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.title}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center p-2.5" : "gap-3.5 px-3.5 py-2.5",
                    isActive
                      ? "bg-green-soft text-ink font-semibold shadow-xs"
                      : "text-muted hover:bg-canvas hover:text-ink"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-green-hover" />
                  )}

                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-green-hover"
                        : "text-muted group-hover:text-ink"
                    )}
                    weight={isActive ? "bold" : "regular"}
                  />

                  {!collapsed && (
                    <span className="truncate">{item.title}</span>
                  )}

                  {item.badge && !collapsed && (
                    <span className="ml-auto rounded-full border border-cyan-border bg-cyan-soft px-2 py-0.5 text-[10px] font-semibold text-ink">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

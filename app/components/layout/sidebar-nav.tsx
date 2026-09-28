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
            <h3 className="px-3 text-[11px]  tracking-wider text-muted-foreground/80 uppercase">
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
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center p-2.5" : "gap-3.5 px-3.5 py-2.5",
                    isActive
                      ? "bg-[#dcf6e8] text-[#136148] font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  {/* Left green active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#198754]" />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-[#198754]"
                        : "text-slate-500 group-hover:text-slate-800"
                    )}
                  />

                  {!collapsed && (
                    <span className="truncate">{item.title}</span>
                  )}

                  {item.badge && !collapsed && (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
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

import React from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] text-slate-900 font-sans">
      {/* Scalable Sidebar */}
      <AppSidebar />

      {/* Main Layout Area */}
      {/* overflow-x-clip (not hidden) clips the fixed-sidebar column's overflow
          on narrow viewports without becoming a scroll container, so
          position:sticky inside <main> still tracks the viewport. */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-clip">
        <AppHeader />
        <main className="flex-1 px-8 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}

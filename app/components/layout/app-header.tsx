"use client";

import * as React from "react";
import { CaretLeft, CaretRight, User, List, X } from "@phosphor-icons/react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { MobileSidebarContent } from "./app-sidebar";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Format the current path to readable title
  const currentSection =
    pathname.split("/").filter(Boolean).pop() || "Overview";
  const formattedTitle =
    currentSection.charAt(0).toUpperCase() + currentSection.slice(1);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 md:px-8 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-200/50 transition-colors">
        {/* Left: Hamburger (Mobile) + Navigation buttons and Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile Hamburger Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-[8px] bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 transition-colors shadow-2xs cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <List size={20} weight="bold" />
          </button>

          {/* Back/Forward buttons (hidden on mobile, visible on desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 transition-colors shadow-2xs cursor-pointer"
              aria-label="Go back"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              onClick={() => router.forward()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 transition-colors shadow-2xs cursor-pointer"
              aria-label="Go forward"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1 text-base sm:text-lg min-w-0 truncate">
            <span className="hidden sm:inline font-sans text-slate-400 font-light shrink-0">
              Pages/
            </span>
            <span className="font-sans font-bold text-[#0f2027] tracking-tight truncate">
              {formattedTitle}
            </span>
          </div>
        </div>

        {/* Right: User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900 text-white overflow-hidden shadow-2xs">
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
              <AvatarImage src="/images/avatar.png" alt="Charles Reyes" />
              <AvatarFallback className="bg-slate-900 text-white">
                <User size={16} weight="bold" />
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col text-left min-w-0">
            <span className="text-xs sm:text-sm font-bold font-display text-slate-900 leading-tight truncate">
              Charles Reyes
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-sans leading-tight truncate">
              admin@umak.edu.ph
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        {mobileNavOpen && (
          <DialogPortal>
            <DialogOverlay />
            <div className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-paper shadow-2xl animate-in slide-in-from-left duration-200 border-r border-line flex flex-col">
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-[6px] p-1.5 text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
              <MobileSidebarContent onClose={() => setMobileNavOpen(false)} />
            </div>
          </DialogPortal>
        )}
      </Dialog>
    </>
  );
}


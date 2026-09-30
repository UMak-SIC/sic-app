"use client";

import { CaretLeft, CaretRight, User } from "@phosphor-icons/react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  // Format the current path to readable title
  const currentSection =
    pathname.split("/").filter(Boolean).pop() || "Overview";
  const formattedTitle =
    currentSection.charAt(0).toUpperCase() + currentSection.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-8 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-200/50 transition-colors">
      {/* Left: Navigation buttons and Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1.5 text-lg">
          <span className="font-sans text-slate-400 font-light">Pages/</span>
          <span className="font-sans font-bold text-[#0f2027] tracking-tight">
            {formattedTitle}
          </span>
        </div>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white overflow-hidden shadow-2xs">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/images/avatar.png" alt="Charles Reyes" />
            <AvatarFallback className="bg-slate-900 text-white">
              <User size={18} weight="bold" />
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col text-left">
          <span className="text-sm font-bold font-display text-slate-900 leading-tight">
            Charles Reyes
          </span>
          <span className="text-xs text-slate-400 font-sans leading-tight">
            email here
          </span>
        </div>
      </div>
    </header>
  );
}

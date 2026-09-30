"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function SidebarPromoCard() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative mx-3 my-4 overflow-hidden rounded-2xl p-4 shadow-2xs border border-[#006649]/20 transition-all duration-200">
      {/* Background Gradient Layer with 37% Opacity */}
      <div
        style={{
          background:
            "linear-gradient(155deg, #006649 0%, #00543c 60%, #e5f8e2 160%)",
          opacity: 0.37,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Dismiss Button (White) */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 z-20 text-white hover:text-white/80 transition-colors cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content Container (100% Opacity with White Text) */}
      <div className="relative z-10 text-white">
        {/* Header with Cute Mascot Icon & Title */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/25 p-1 backdrop-blur-xs border border-white/30 shadow-2xs">
            <Image
              src="/cute-logo.svg"
              alt="Cute SIC Mascot"
              width={36}
              height={36}
              style={{ width: "auto", height: "auto" }}
              className="max-h-9 max-w-9 object-contain"
              priority
            />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display leading-tight text-white">
              Come Visit
            </h4>
            <h4 className="text-sm font-bold font-display leading-tight text-white">
              Our Facebook
            </h4>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] leading-relaxed text-white/90 mb-3 font-sans">
          Stay updated on our latest announcements, event and updates
        </p>

        {/* Action Button */}
        <Button
          asChild
          size="sm"
          className="w-full rounded-xl bg-[#006649] hover:bg-[#00543c] text-white font-semibold text-xs h-8 shadow-xs border border-white/20 cursor-pointer transition-colors"
        >
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit now!
          </a>
        </Button>
      </div>
    </div>
  );
}

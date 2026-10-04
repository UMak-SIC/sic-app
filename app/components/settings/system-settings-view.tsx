"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { systemRuleCards, toneStyles } from "./settings-data";

export function SystemSettingsView() {
  return (
    <div className="w-full pb-14 font-sans">
      {/* 2x2 Full-Width Responsive Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {systemRuleCards.map((card) => {
          const Icon = card.icon;
          const style = toneStyles[card.tone];

          return (
            <article
              key={card.key}
              className={cn(
                "relative p-5 sm:p-8 rounded-[16px] border transition-all duration-200 flex flex-col justify-between gap-5 sm:gap-6 overflow-hidden w-full shadow-xs",
                style.cardBg
              )}
            >
              {/* Header: Icon, Title & Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[10px] sm:rounded-[12px]",
                      style.iconBg
                    )}
                  >
                    <Icon size={22} weight="bold" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base sm:text-lg font-display font-bold text-ink tracking-tight truncate">
                      {card.label}
                    </h3>
                    <p className="text-xs text-muted truncate">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "self-start sm:self-auto shrink-0 whitespace-nowrap rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-sans tracking-wide",
                    style.badge
                  )}
                >
                  {card.badge}
                </span>
              </div>

              {/* Content Bullets */}
              <ul className="space-y-3 text-xs sm:text-sm text-ink/90 font-sans">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-3 leading-relaxed"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                        style.bulletDot
                      )}
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

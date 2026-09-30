"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  CheckCircle,
  Clock,
  HourglassMedium,
  Lightning,
  ShieldCheck,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { DeliveryQueueBreakdown, ProviderQuotaInfo } from "./campaign-types";
import { cn } from "@/lib/utils";

interface CampaignDeliveryQueueProps {
  eventName?: string;
  queueBreakdown?: DeliveryQueueBreakdown;
  providers?: ProviderQuotaInfo[];
}

const DEFAULT_BREAKDOWN: DeliveryQueueBreakdown = {
  queued: 6,
  sending: 1,
  sent: 109,
  bounced: 1,
  failed: 2,
};

const DEFAULT_PROVIDERS: ProviderQuotaInfo[] = [
  {
    provider: "Mailgun",
    role: "primary",
    used: 92,
    total: 100,
    resetTime: "00:00 UTC",
    timezone: "UTC",
    notes: "Primary sender",
  },
  {
    provider: "Brevo",
    role: "fallback",
    used: 0,
    total: 300,
    resetTime: "00:00 CET",
    timezone: "Europe/Paris",
    notes: "Backup sender",
  },
];

export function CampaignDeliveryQueue({
  eventName = "UMak SIC General Assembly",
  queueBreakdown = DEFAULT_BREAKDOWN,
  providers = DEFAULT_PROVIDERS,
}: CampaignDeliveryQueueProps) {
  const mailgunProvider = providers.find((p) => p.provider === "Mailgun") || DEFAULT_PROVIDERS[0];
  const brevoProvider = providers.find((p) => p.provider === "Brevo") || DEFAULT_PROVIDERS[1];

  const queueStages = [
    {
      id: "queued",
      label: "Waiting in Queue",
      description: "Waiting for scheduled sending window",
      count: queueBreakdown.queued,
      icon: HourglassMedium,
      iconBg: "bg-amber/15 text-amber",
      cardGradient: "radial-gradient(120% 120% at 10% 10%, rgba(251,240,223,0.85) 0%, rgba(255,255,255,0.95) 75%)",
      borderHover: "hover:border-amber/60 hover:shadow-amber-soft",
      countColor: "text-amber",
      badgeClass: "bg-amber-soft text-amber border-amber-border",
    },
    {
      id: "sending",
      label: "Currently Sending",
      description: "Being dispatched right now",
      count: queueBreakdown.sending,
      icon: Clock,
      iconBg: "bg-cyan/15 text-cyan",
      cardGradient: "radial-gradient(120% 120% at 10% 10%, rgba(217,241,240,0.85) 0%, rgba(255,255,255,0.95) 75%)",
      borderHover: "hover:border-cyan/60 hover:shadow-cyan-soft",
      countColor: "text-cyan",
      badgeClass: "bg-cyan-soft text-cyan border-cyan-border",
      animateIcon: true,
    },
    {
      id: "sent",
      label: "Delivered to Inboxes",
      description: "Delivered successfully to students",
      count: queueBreakdown.sent,
      icon: CheckCircle,
      iconBg: "bg-green/15 text-green",
      cardGradient: "radial-gradient(120% 120% at 10% 10%, rgba(223,241,233,0.85) 0%, rgba(255,255,255,0.95) 75%)",
      borderHover: "hover:border-green/60 hover:shadow-green-soft",
      countColor: "text-green",
      badgeClass: "bg-green-soft text-green border-green-border",
    },
    {
      id: "bounced",
      label: "Bounced / Mailbox Full",
      description: "Student email inbox is full or rejected",
      count: queueBreakdown.bounced,
      icon: XCircle,
      iconBg: "bg-red/15 text-red",
      cardGradient: "radial-gradient(120% 120% at 10% 10%, rgba(255,233,235,0.85) 0%, rgba(255,255,255,0.95) 75%)",
      borderHover: "hover:border-red/60 hover:shadow-red-soft",
      countColor: "text-red",
      badgeClass: "bg-red-soft text-red border-red-border",
    },
    {
      id: "failed",
      label: "Needs Attention",
      description: "Ready to retry without creating duplicates",
      count: queueBreakdown.failed,
      icon: WarningCircle,
      iconBg: "bg-red/15 text-red",
      cardGradient: "radial-gradient(120% 120% at 10% 10%, rgba(254,226,226,0.85) 0%, rgba(255,255,255,0.95) 75%)",
      borderHover: "hover:border-red/60 hover:shadow-red-soft",
      countColor: "text-red",
      badgeClass: "bg-red-soft text-red border-red-border",
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* 1. Sleek Capacity Gauges (Mailgun Primary & Brevo Backup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Sender Gauge */}
        <div className="p-5 bg-card rounded-[14px] border border-line shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightning size={16} className="text-cyan" weight="bold" />
              <span className="text-xs font-bold text-ink font-display">Primary Sender</span>
            </div>
            <span className="text-[11px] font-mono text-muted">Mailgun</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-display font-extrabold text-ink">
                {mailgunProvider.used}
                <span className="text-sm text-muted font-normal"> / {mailgunProvider.total} emails</span>
              </span>
              <span className="text-xs font-mono font-bold text-cyan">
                {Math.round((mailgunProvider.used / mailgunProvider.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan h-full rounded-full transition-all duration-500"
                style={{ width: `${(mailgunProvider.used / mailgunProvider.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted flex items-center justify-between pt-1 border-t border-line-subtle">
            <span>Daily capacity</span>
            <span>Resets at midnight UTC</span>
          </div>
        </div>

        {/* Backup Sender Gauge */}
        <div className="p-5 bg-card rounded-[14px] border border-line shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-green" weight="bold" />
              <span className="text-xs font-bold text-ink font-display">Backup Sender</span>
            </div>
            <span className="text-[11px] font-mono text-muted">Brevo</span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-display font-extrabold text-ink">
                {brevoProvider.used}
                <span className="text-sm text-muted font-normal"> / {brevoProvider.total} emails</span>
              </span>
              <span className="text-xs font-mono font-bold text-green">
                {Math.round((brevoProvider.used / brevoProvider.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-green h-full rounded-full transition-all duration-500"
                style={{ width: `${(brevoProvider.used / brevoProvider.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted flex items-center justify-between pt-1 border-t border-line-subtle">
            <span>Automatic overflow</span>
            <span>Ready if primary limit is reached</span>
          </div>
        </div>
      </div>

      {/* 2. Animated Gradient Cards for Live Delivery Pipeline (No Retry Button) */}
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-base font-display font-extrabold text-ink tracking-tight">
            Live Delivery Pipeline
          </h4>
          <p className="text-xs text-muted">
            Live status for every recipient in this announcement
          </p>
        </div>

        {/* 5 Responsive Animated Gradient Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {queueStages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                style={{ background: stage.cardGradient }}
                className={cn(
                  "group relative p-4 rounded-[14px] border border-line shadow-xs flex flex-col justify-between min-h-[140px] transition-all duration-200 cursor-default",
                  stage.borderHover
                )}
              >
                {/* Top Row: Icon & Status Label */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border border-black/5 shadow-2xs",
                      stage.iconBg
                    )}
                  >
                    <Icon
                      size={16}
                      weight="bold"
                      className={cn(stage.animateIcon && "animate-spin")}
                    />
                  </div>

                  <span
                    className={cn(
                      "text-2xl font-display font-extrabold tracking-tight",
                      stage.countColor
                    )}
                  >
                    {stage.count}
                  </span>
                </div>

                {/* Bottom Content: Title & Plain-English Description */}
                <div className="mt-3">
                  <strong className="text-xs font-bold font-display text-ink block leading-snug">
                    {stage.label}
                  </strong>
                  <p className="text-[10.5px] text-muted leading-tight font-sans mt-0.5 line-clamp-2">
                    {stage.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

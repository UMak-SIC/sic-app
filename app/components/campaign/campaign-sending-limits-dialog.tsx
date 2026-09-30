"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightning,
  ShieldCheck,
  ArrowsLeftRight,
  Clock,
  CheckCircle,
  X,
  Gauge,
  Sparkle,
  ArrowRight,
  LockKey,
  CalendarBlank,
} from "@phosphor-icons/react";
import { ProviderQuotaInfo } from "./campaign-types";
import { cn } from "@/lib/utils";

interface CampaignSendingLimitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers?: ProviderQuotaInfo[];
}

const DEFAULT_PROVIDERS: ProviderQuotaInfo[] = [
  {
    provider: "Mailgun",
    role: "primary",
    used: 92,
    total: 100,
    resetTime: "00:00 UTC",
    timezone: "UTC",
    notes: "Primary outbound dispatcher. Handles initial delivery queue.",
  },
  {
    provider: "Brevo",
    role: "fallback",
    used: 0,
    total: 300,
    resetTime: "00:00 CET",
    timezone: "Europe/Paris",
    notes: "Automatic backup sender. Takes over seamlessly when primary limit is met.",
  },
];

export function CampaignSendingLimitsDialog({
  open,
  onOpenChange,
  providers = DEFAULT_PROVIDERS,
}: CampaignSendingLimitsDialogProps) {
  const [activeTab, setActiveTab] = React.useState<"gauges" | "architecture" | "protection">("gauges");

  const mailgun = providers.find((p) => p.provider === "Mailgun") || DEFAULT_PROVIDERS[0];
  const brevo = providers.find((p) => p.provider === "Brevo") || DEFAULT_PROVIDERS[1];

  const totalUsed = mailgun.used + brevo.used;
  const totalLimit = mailgun.total + brevo.total;
  const totalPercent = Math.round((totalUsed / totalLimit) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-line rounded-[18px] p-0 overflow-hidden shadow-2xl font-sans">
        {/* Modal Header */}
        <div className="p-6 pr-12 border-b border-line-subtle bg-paper flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-green-soft text-green border border-green-border">
                <span className="size-1.5 rounded-full bg-green animate-pulse" />
                Failover Ready
              </span>
              <span className="text-xs text-muted font-mono">Multi-Sender Routing</span>
            </div>

            <DialogTitle className="text-xl font-display font-extrabold text-ink tracking-tight mt-1">
              Sending Limits & Quota Protection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted font-sans">
              Live delivery capacity, automatic failover rules, and duplicate protection.
            </DialogDescription>
          </div>
        </div>

        {/* Modal Navigation Segmented Tabs */}
        <div className="px-6 py-2.5 bg-canvas/40 border-b border-line-subtle flex items-center justify-between gap-2">
          <div className="inline-flex rounded-[8px] border border-line p-0.5 bg-card text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("gauges")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs flex items-center gap-1.5",
                activeTab === "gauges"
                  ? "bg-ink text-paper font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              <Gauge size={14} weight={activeTab === "gauges" ? "bold" : "regular"} />
              <span>Capacity Gauges</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs flex items-center gap-1.5",
                activeTab === "architecture"
                  ? "bg-ink text-paper font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              <ArrowsLeftRight size={14} weight={activeTab === "architecture" ? "bold" : "regular"} />
              <span>Failover Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("protection")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs flex items-center gap-1.5",
                activeTab === "protection"
                  ? "bg-ink text-paper font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              <ShieldCheck size={14} weight={activeTab === "protection" ? "bold" : "regular"} />
              <span>Protection Rules</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted font-mono">
            <span>Total Bandwidth:</span>
            <strong className="text-ink font-bold">{totalLimit} emails/day</strong>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto flex flex-col gap-5">
          {/* TAB 1: Capacity Gauges */}
          {activeTab === "gauges" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Aggregate Capacity Overview Banner */}
              <div className="p-4 rounded-[12px] bg-linear-to-r from-cyan-soft/40 via-green-soft/40 to-transparent border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-[8px] bg-ink text-white flex items-center justify-center shrink-0">
                    <Gauge size={20} weight="bold" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold font-display uppercase tracking-wider text-muted">
                      Combined Daily Bandwidth
                    </span>
                    <h4 className="text-lg font-display font-extrabold text-ink">
                      {totalUsed} <span className="text-sm font-normal text-muted">/ {totalLimit} emails used today</span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-mono font-bold text-ink bg-card px-2.5 py-1 rounded-[6px] border border-line">
                    {totalLimit - totalUsed} remaining
                  </span>
                </div>
              </div>

              {/* Two Gauges: Mailgun & Brevo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Provider Gauge */}
                <div className="p-5 bg-card rounded-[14px] border border-line shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-[6px] bg-cyan-soft text-cyan flex items-center justify-center">
                        <Lightning size={16} weight="bold" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-ink font-display block leading-none">
                          Mailgun (Primary)
                        </strong>
                        <span className="text-[10px] text-cyan font-semibold">
                          Active Sender
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan">
                      {Math.round((mailgun.used / mailgun.total) * 100)}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1.5 text-xs">
                      <span className="font-display font-extrabold text-xl text-ink">
                        {mailgun.used}
                        <span className="text-xs text-muted font-normal"> / {mailgun.total} emails</span>
                      </span>
                      <span className="text-[11px] text-muted font-medium">
                        {mailgun.total - mailgun.used} left
                      </span>
                    </div>

                    <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan h-full rounded-full transition-all duration-500"
                        style={{ width: `${(mailgun.used / mailgun.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line-subtle flex flex-col gap-1 text-[11px] text-muted">
                    <div className="flex items-center justify-between">
                      <span>Daily Limit:</span>
                      <strong className="text-ink font-mono">{mailgun.total} / day</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Reset Window:</span>
                      <span className="text-ink font-medium">Midnight (00:00 UTC)</span>
                    </div>
                  </div>
                </div>

                {/* Backup Provider Gauge */}
                <div className="p-5 bg-card rounded-[14px] border border-line shadow-xs flex flex-col justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-[6px] bg-green-soft text-green flex items-center justify-center">
                        <ShieldCheck size={16} weight="bold" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-ink font-display block leading-none">
                          Brevo (Backup)
                        </strong>
                        <span className="text-[10px] text-green font-semibold">
                          Auto Overflow
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-green">
                      {Math.round((brevo.used / brevo.total) * 100)}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1.5 text-xs">
                      <span className="font-display font-extrabold text-xl text-ink">
                        {brevo.used}
                        <span className="text-xs text-muted font-normal"> / {brevo.total} emails</span>
                      </span>
                      <span className="text-[11px] text-muted font-medium">
                        {brevo.total - brevo.used} ready
                      </span>
                    </div>

                    <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, (brevo.used / brevo.total) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line-subtle flex flex-col gap-1 text-[11px] text-muted">
                    <div className="flex items-center justify-between">
                      <span>Daily Limit:</span>
                      <strong className="text-ink font-mono">{brevo.total} / day</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Reset Window:</span>
                      <span className="text-ink font-medium">Midnight (00:00 CET)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Failover Architecture Visualizer */}
          {activeTab === "architecture" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 bg-paper rounded-[12px] border border-line flex flex-col gap-4">
                <span className="text-xs font-bold font-display text-ink uppercase tracking-wider">
                  Automated Multi-Sender Dispatch Workflow
                </span>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Step 1 */}
                  <div className="p-3.5 bg-card rounded-[10px] border border-line flex flex-col gap-2 relative">
                    <div className="size-7 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center font-display">
                      1
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-ink font-display block">
                        Batch Prepared
                      </strong>
                      <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
                        Recipients verified & tickets formatted.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-cyan-soft/30 rounded-[10px] border border-cyan-border flex flex-col gap-2 relative">
                    <div className="size-7 rounded-full bg-cyan text-white text-xs font-bold flex items-center justify-center font-display">
                      2
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-ink font-display block">
                        Primary Mailgun
                      </strong>
                      <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
                        Dispatches first 100 emails at full speed.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-green-soft/30 rounded-[10px] border border-green-border flex flex-col gap-2 relative">
                    <div className="size-7 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center font-display">
                      3
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-ink font-display block">
                        Auto Brevo Switch
                      </strong>
                      <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
                        Overflow routes to Brevo with 0 dropped emails.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-card rounded-[10px] border border-line flex flex-col gap-2 relative">
                    <div className="size-7 rounded-full bg-muted-light text-ink text-xs font-bold flex items-center justify-center font-display">
                      4
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-ink font-display block">
                        Midnight Reset
                      </strong>
                      <p className="text-[10.5px] text-muted mt-0.5 leading-snug">
                        Daily counters automatically refresh.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[10px] bg-canvas/60 border border-line text-xs text-muted flex items-center gap-2 font-sans">
                <CheckCircle size={16} className="text-green shrink-0" weight="bold" />
                <span>
                  No manual intervention required. If Mailgun reaches its daily capacity, remaining students receive their passes without delay.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Protection & Security Rules */}
          {activeTab === "protection" && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Guarantee 1 */}
              <div className="p-4 bg-card rounded-[12px] border border-line flex items-start gap-3.5">
                <div className="size-8 rounded-[6px] bg-green-soft text-green flex items-center justify-center shrink-0">
                  <LockKey size={18} weight="bold" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <strong className="text-xs font-bold text-ink font-display">
                    Zero Duplicate Delivery Guarantee
                  </strong>
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    Each student announcement is secured with a unique pass key. Retrying failed emails will never trigger duplicate emails to already-delivered students.
                  </p>
                </div>
              </div>

              {/* Guarantee 2 */}
              <div className="p-4 bg-card rounded-[12px] border border-line flex items-start gap-3.5">
                <div className="size-8 rounded-[6px] bg-cyan-soft text-cyan flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} weight="bold" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <strong className="text-xs font-bold text-ink font-display">
                    Immutable QR Check-In Pass
                  </strong>
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    A student's QR code remains constant even if their email is resent or re-delivered, ensuring seamless scanner verification at the venue doors.
                  </p>
                </div>
              </div>

              {/* Guarantee 3 */}
              <div className="p-4 bg-card rounded-[12px] border border-line flex items-start gap-3.5">
                <div className="size-8 rounded-[6px] bg-amber-soft text-amber flex items-center justify-center shrink-0">
                  <Sparkle size={18} weight="bold" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <strong className="text-xs font-bold text-ink font-display">
                    Campus Domain Protection
                  </strong>
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    Automatic delivery throttling prevents university email servers from flagging announcement batches as promotional spam.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line-subtle bg-paper flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted font-sans">
            <ShieldCheck size={15} className="text-green shrink-0" weight="bold" />
            <span>Automatic protection active</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-[6px] h-8.5 px-4 cursor-pointer hover:bg-canvas"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SendingLimitsTriggerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-linear-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-full h-8.5 px-4 flex items-center gap-1.5 shadow-xs hover:shadow-green-soft transition-all cursor-pointer",
        className
      )}
    >
      <Gauge size={15} weight="bold" />
      <span>Sending Limits</span>
      <span className="size-1.5 rounded-full bg-white animate-pulse ml-0.5" />
    </Button>
  );
}

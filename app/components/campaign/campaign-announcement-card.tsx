"use client";

import * as React from "react";
import {
  CheckCircle,
  HourglassMedium,
  MapPin,
  CalendarBlank,
  Users,
  ArrowRight,
} from "@phosphor-icons/react";
import { CampaignSummary } from "./campaign-types";

interface CampaignAnnouncementCardProps {
  campaign: CampaignSummary;
  onClick: () => void;
  gradientIndex?: number;
}

const CARD_GRADIENTS = [
  "radial-gradient(120% 140% at 20% 10%, rgba(8,127,140,0.85), transparent 70%), linear-gradient(135deg, #093c44, #12333a)",
  "radial-gradient(120% 140% at 80% 15%, rgba(41,163,136,0.8), transparent 70%), linear-gradient(135deg, #102a24, #174b40)",
  "radial-gradient(120% 140% at 30% 85%, rgba(217,141,43,0.75), transparent 70%), linear-gradient(135deg, #2b2010, #3d2f16)",
  "radial-gradient(120% 140% at 70% 80%, rgba(34,184,201,0.8), transparent 70%), linear-gradient(135deg, #132e34, #1b4750)",
];

export function CampaignAnnouncementCard({
  campaign,
  onClick,
  gradientIndex = 0,
}: CampaignAnnouncementCardProps) {
  const gradient = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length];
  const percent =
    campaign.totalStudents > 0
      ? Math.round((campaign.deliveredCount / campaign.totalStudents) * 100)
      : 0;

  const venue = campaign.venue || "Venue to be confirmed";
  const dateStr = campaign.eventDate || campaign.sentDate;
  const isNoCampaigns = (campaign.campaignsCount ?? 0) === 0 && campaign.deliveredCount === 0 && campaign.sendingCount === 0 && campaign.invalidEmailCount === 0;
  const pendingCount = campaign.pendingCount ?? Math.max(0, campaign.totalStudents - campaign.deliveredCount - campaign.sendingCount - campaign.invalidEmailCount);

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] bg-card border border-line shadow-xs transition-all duration-250 hover:shadow-md hover:border-cyan/50 hover:-translate-y-0.5 cursor-pointer font-sans"
    >
      {/* Top Media Banner */}
      <div
        className="relative h-40 w-full p-3.5 flex flex-col justify-between overflow-hidden"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Top Right Floating Status Badge */}
        <div className="relative z-10 flex justify-end">
          {isNoCampaigns ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-black/50 text-paper border border-white/20 backdrop-blur-xs shadow-xs">
              <HourglassMedium size={13} weight="bold" />
              No Emails Sent
            </span>
          ) : campaign.status === "sending" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-cyan/90 text-white backdrop-blur-xs shadow-xs">
              <HourglassMedium size={13} weight="bold" className="animate-spin" />
              Sending ({campaign.sendingCount})
            </span>
          ) : campaign.status === "needs_attention" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-red/90 text-white backdrop-blur-xs shadow-xs">
              <HourglassMedium size={13} weight="bold" />
              Needs Attention ({campaign.invalidEmailCount})
            </span>
          ) : pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber/90 text-white backdrop-blur-xs shadow-xs">
              <CheckCircle size={13} weight="bold" />
              {percent}% Delivered · {pendingCount} Not Yet Emailed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-green/90 text-white backdrop-blur-xs shadow-xs">
              <CheckCircle size={13} weight="bold" />
              All Delivered (100%)
            </span>
          )}
        </div>

        {/* Bottom Left Floating Recipient Pill */}
        <div className="relative z-10 flex items-center mt-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 text-cyan-soft font-semibold text-[11px] backdrop-blur-md border border-white/15 shadow-xs">
            <Users size={13} weight="bold" />
            {isNoCampaigns
              ? `${campaign.totalStudents} Registered Students`
              : `${campaign.deliveredCount}/${campaign.totalStudents} Delivered`}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Headline Title: Event Name (font-sans) */}
          <h3 className="text-base font-sans font-bold text-ink leading-snug group-hover:text-cyan transition-colors line-clamp-1">
            {campaign.eventName}
          </h3>
          {/* Subtext Content: Subject / Broadcast Summary (font-sans) */}
          <p className="text-xs font-sans font-normal text-muted mt-1.5 leading-relaxed line-clamp-2">
            {isNoCampaigns
              ? "No email announcements have been sent for this event yet."
              : campaign.subject}
          </p>
        </div>

        {/* Card Footer: Location & Date */}
        <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
          {/* Left: Location & Event Date */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-cyan-soft text-cyan flex items-center justify-center shrink-0">
              <MapPin size={15} weight="bold" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-ink text-[11.5px] leading-tight truncate font-sans">
                {venue}
              </span>
              <span className="text-[10px] text-muted flex items-center gap-1 truncate mt-0.5 font-sans">
                <CalendarBlank size={11} className="shrink-0" />
                {dateStr}
              </span>
            </div>
          </div>

          {/* Right: Action Trigger */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan group-hover:translate-x-0.5 transition-transform shrink-0 pl-2 font-sans">
            <span>
              {isNoCampaigns
                ? "Send Announcement"
                : pendingCount > 0
                ? `Email remaining (${pendingCount})`
                : "View report"}
            </span>
            <ArrowRight size={13} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}

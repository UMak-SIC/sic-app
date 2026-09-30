"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { KpiCardRow } from "@/components/campaign/campaign-kpi-row";
import { CampaignAnnouncementCard } from "@/components/campaign/campaign-announcement-card";
import { CAMPAIGNS_DATA } from "@/components/campaign/campaign-data";
import { CampaignSummary } from "@/components/campaign/campaign-types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CampaignPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "sent" | "draft">("all");

  const filteredCampaigns = CAMPAIGNS_DATA.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      c.subject.toLowerCase().includes(q) ||
      c.eventName.toLowerCase().includes(q) ||
      (c.venue && c.venue.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenDetails = (campaign: CampaignSummary) => {
    if (campaign.status === "draft") {
      router.push("/campaign/new");
      return;
    }
    router.push(`/campaign/${campaign.id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-14 font-sans">
      {/* Top Header */}
      <PageHeader
        title={<span className="font-display font-bold text-ink">Announcements & Emails</span>}
        description="Send personalized event updates and official QR ticket check-in passes to students."
        action={
          <PageHeaderButton
            icon={<Plus size={18} weight="bold" className="text-white" />}
            onClick={() => router.push("/campaign/new")}
          >
            Send New Email
          </PageHeaderButton>
        }
      />

      {/* 1. Animated KPI Sparkline Cards Row (Sent, Queued, Failed) */}
      <KpiCardRow />

      {/* 2. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements, events, or venue..."
            className="pl-9 h-9.5 text-xs bg-card rounded-[8px] border-line font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <div className="inline-flex rounded-[8px] border border-line p-0.5 bg-canvas/60 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs shrink-0",
                statusFilter === "all"
                  ? "bg-card text-ink font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              All Announcements ({CAMPAIGNS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("sent")}
              className={cn(
                "px-3.5 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "sent"
                  ? "bg-card text-green font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Sent
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={cn(
                "px-3.5 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "draft"
                  ? "bg-card text-amber font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Drafts
            </button>
          </div>
        </div>
      </div>

      {/* 3. Visual Announcement Cards Grid (Mockup style with Venue & Date) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCampaigns.map((campaign, idx) => (
          <CampaignAnnouncementCard
            key={campaign.id}
            campaign={campaign}
            gradientIndex={idx}
            onClick={() => handleOpenDetails(campaign)}
          />
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="p-12 text-center text-sm text-muted bg-card border border-dashed border-line rounded-[16px]">
          No announcements found matching your search.
        </div>
      )}
    </div>
  );
}

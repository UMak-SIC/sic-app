"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MagnifyingGlass, PaperPlaneTilt, HourglassMedium, WarningCircle } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { KpiCardRow } from "@/components/campaign/campaign-kpi-row";
import { CampaignAnnouncementCard } from "@/components/campaign/campaign-announcement-card";
import { CampaignSummary } from "@/components/campaign/campaign-types";
import { Input } from "@/components/ui/input";

export default function CampaignPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [campaigns, setCampaigns] = React.useState<CampaignSummary[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/campaigns")
      .then(async (response) => {
        const payload = await response.json() as { campaigns?: Array<{ id: string; subject: string; eventName: string; venue: string | null; startsAt: string; createdAt: string; counts: Record<string, number> }>; error?: string };
        if (!response.ok) throw new Error(payload.error);
        return payload.campaigns ?? [];
      })
      .then((items) => {
        if (!active) return;
        setCampaigns(items.map((campaign) => {
          const needsAttention = (campaign.counts.BOUNCED ?? 0) + (campaign.counts.FAILED ?? 0);
          const sending = (campaign.counts.QUEUED ?? 0) + (campaign.counts.SENDING ?? 0);
          const total = Object.values(campaign.counts).reduce((sum, count) => sum + count, 0);
          return {
            id: campaign.id,
            subject: campaign.subject,
            eventName: campaign.eventName,
            venue: campaign.venue ?? undefined,
            eventDate: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.startsAt)),
            sentDate: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(campaign.createdAt)),
            status: sending > 0 ? "sending" : needsAttention > 0 ? "needs_attention" : "sent",
            totalStudents: total,
            deliveredCount: campaign.counts.SENT ?? 0,
            sendingCount: sending,
            invalidEmailCount: needsAttention,
            attachedFilesCount: 0,
            recipients: [],
          };
        }));
      })
      .catch(() => active && setLoadError("We could not load email campaigns. Refresh the page and try again."));
    return () => { active = false; };
  }, []);

  const totals = campaigns.reduce((result, campaign) => ({
    sent: result.sent + campaign.deliveredCount,
    sending: result.sending + campaign.sendingCount,
    failed: result.failed + campaign.invalidEmailCount,
  }), { sent: 0, sending: 0, failed: 0 });

  const filteredCampaigns = campaigns.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      c.subject.toLowerCase().includes(q) ||
      c.eventName.toLowerCase().includes(q) ||
      (c.venue && c.venue.toLowerCase().includes(q));

    return matchesSearch;
  });

  const handleOpenDetails = (campaign: CampaignSummary) => {
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
      <KpiCardRow items={[
        { label: "Delivered Emails", icon: <PaperPlaneTilt size={18} weight="bold" />, color: "var(--green)", data: [0, totals.sent], format: (value) => `${Math.round(value)}` },
        { label: "Waiting to Send", icon: <HourglassMedium size={18} weight="bold" />, color: "var(--amber)", data: [0, totals.sending], format: (value) => `${Math.round(value)}` },
        { label: "Needs Attention", icon: <WarningCircle size={18} weight="bold" />, color: "var(--red)", data: [0, totals.failed], format: (value) => `${Math.round(value)}` },
      ]} />

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

        <span className="text-xs font-medium text-muted">{campaigns.length} announcements</span>
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

      {loadError && <p role="alert" className="text-sm text-red font-sans">{loadError}</p>}

      {!loadError && filteredCampaigns.length === 0 && (
        <div className="p-12 text-center text-sm text-muted bg-card border border-dashed border-line rounded-[16px]">
          {campaigns.length === 0 ? "No email campaigns have been sent yet." : "No announcements found matching your search."}
        </div>
      )}
    </div>
  );
}

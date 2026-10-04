"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MagnifyingGlass, PaperPlaneTilt, HourglassMedium, WarningCircle, Clock } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { CampaignCatalogSkeleton } from "@/components/campaign/campaign-catalog-skeleton";
import { KpiCardRow } from "@/components/campaign/campaign-kpi-row";
import { CampaignAnnouncementCard } from "@/components/campaign/campaign-announcement-card";
import { CampaignSummary } from "@/components/campaign/campaign-types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CampaignStatusFilter = "all" | "emailed" | "no_email" | "needs_attention";

export default function CampaignPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<CampaignStatusFilter>("all");
  const [campaigns, setCampaigns] = React.useState<CampaignSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/campaigns")
      .then(async (response) => {
        const payload = await response.json() as {
          campaigns?: Array<{
            id: string;
            eventId?: string;
            subject: string;
            eventName: string;
            venue: string | null;
            startsAt: string;
            createdAt: string;
            campaignsCount?: number;
            totalStudents?: number;
            deliveredCount?: number;
            sendingCount?: number;
            invalidEmailCount?: number;
            pendingCount?: number;
            counts: Record<string, number>;
          }>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error);
        return payload.campaigns ?? [];
      })
      .then((items) => {
        if (!active) return;
        setCampaigns(items.map((campaign) => {
          const needsAttention = (campaign.counts.BOUNCED ?? 0) + (campaign.counts.FAILED ?? 0);
          const sending = (campaign.counts.QUEUED ?? 0) + (campaign.counts.SENDING ?? 0);
          const delivered = campaign.counts.SENT ?? campaign.deliveredCount ?? 0;
          const total = campaign.totalStudents ?? Object.values(campaign.counts).reduce((sum, count) => sum + count, 0);
          const pending = campaign.pendingCount ?? Math.max(0, total - delivered - sending - needsAttention);
          const campaignsCount = campaign.campaignsCount ?? (delivered > 0 ? 1 : 0);

          let status: CampaignSummary["status"] = "sent";
          if (campaignsCount === 0 && delivered === 0 && sending === 0) {
            status = "no_campaigns";
          } else if (sending > 0) {
            status = "sending";
          } else if (needsAttention > 0) {
            status = "needs_attention";
          }

          return {
            id: campaign.id,
            eventId: campaign.eventId ?? campaign.id,
            subject: campaign.subject,
            eventName: campaign.eventName,
            venue: campaign.venue ?? undefined,
            eventDate: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.startsAt)),
            sentDate: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(campaign.createdAt)),
            status,
            totalStudents: total,
            deliveredCount: delivered,
            sendingCount: sending,
            invalidEmailCount: needsAttention,
            pendingCount: pending,
            campaignsCount,
            attachedFilesCount: 0,
            recipients: [],
          };
        }));
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoadError("We could not load email announcements. Refresh the page and try again.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const totals = campaigns.reduce((result, campaign) => ({
    sent: result.sent + campaign.deliveredCount,
    sending: result.sending + campaign.sendingCount,
    pending: result.pending + (campaign.pendingCount ?? 0),
    failed: result.failed + campaign.invalidEmailCount,
  }), { sent: 0, sending: 0, pending: 0, failed: 0 });

  const emailedCount = React.useMemo(() => {
    return campaigns.filter((c) => c.status !== "no_campaigns" || c.deliveredCount > 0 || c.sendingCount > 0).length;
  }, [campaigns]);

  const noEmailCount = React.useMemo(() => {
    return campaigns.filter((c) => (c.status === "no_campaigns" || (c.campaignsCount ?? 0) === 0) && c.deliveredCount === 0 && c.sendingCount === 0).length;
  }, [campaigns]);

  const needsAttentionCount = React.useMemo(() => {
    return campaigns.filter((c) => c.status === "needs_attention" || c.invalidEmailCount > 0).length;
  }, [campaigns]);

  const filteredCampaigns = campaigns.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      c.subject.toLowerCase().includes(q) ||
      c.eventName.toLowerCase().includes(q) ||
      (c.venue && c.venue.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const isNoEmail = (c.status === "no_campaigns" || (c.campaignsCount ?? 0) === 0) && c.deliveredCount === 0 && c.sendingCount === 0;
    const isEmailed = c.status !== "no_campaigns" || c.deliveredCount > 0 || c.sendingCount > 0;

    if (statusFilter === "emailed") return isEmailed;
    if (statusFilter === "no_email") return isNoEmail;
    if (statusFilter === "needs_attention") return c.status === "needs_attention" || c.invalidEmailCount > 0;
    return true;
  });

  const handleOpenDetails = (campaign: CampaignSummary) => {
    if (campaign.status === "no_campaigns") {
      router.push(`/campaign/new?eventId=${campaign.eventId ?? campaign.id}`);
    } else {
      router.push(`/campaign/${campaign.id}`);
    }
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

      {loading ? (
        <CampaignCatalogSkeleton cardCount={6} />
      ) : (
        <>
          {/* 1. Animated KPI Sparkline Cards Row */}
          <KpiCardRow items={[
            { label: "Delivered Emails", icon: <PaperPlaneTilt size={18} weight="bold" />, color: "var(--green)", data: [0, totals.sent], format: (value) => `${Math.round(value)}` },
            { label: "Sending", icon: <HourglassMedium size={18} weight="bold" />, color: "var(--cyan)", data: [0, totals.sending], format: (value) => `${Math.round(value)}` },
            { label: "Not Yet Emailed", icon: <Clock size={18} weight="bold" />, color: "var(--amber)", data: [0, totals.pending], format: (value) => `${Math.round(value)}` },
            { label: "Needs Attention", icon: <WarningCircle size={18} weight="bold" />, color: "var(--red)", data: [0, totals.failed], format: (value) => `${Math.round(value)}` },
          ]} />

          {/* 2. Filter Bar & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
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

            <div className="inline-flex w-full overflow-x-auto rounded-[9px] border border-line bg-canvas/60 p-0.5 text-xs sm:w-auto">
              {[
                { id: "all", label: `All (${campaigns.length})` },
                { id: "emailed", label: `Already Emailed (${emailedCount})` },
                { id: "no_email", label: `No Email Yet (${noEmailCount})` },
                ...(needsAttentionCount > 0 ? [{ id: "needs_attention", label: `Needs Attention (${needsAttentionCount})` }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as CampaignStatusFilter)}
                  className={cn(
                    "shrink-0 rounded-[6px] px-3 py-1.5 font-medium transition-colors cursor-pointer font-sans",
                    statusFilter === tab.id
                      ? "bg-card font-bold text-ink shadow-xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Visual Announcement Cards Grid */}
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
            <div className="p-12 text-center text-sm text-muted bg-card border border-dashed border-line rounded-[16px] font-sans">
              {campaigns.length === 0
                ? "No published events are currently available."
                : statusFilter === "no_email"
                ? "No event hubs found with no email sent yet."
                : statusFilter === "emailed"
                ? "No event hubs found with emails already sent."
                : statusFilter === "needs_attention"
                ? "No event hubs found with delivery issues."
                : "No announcements found matching your search."}
            </div>
          )}
        </>
      )}
    </div>
  );
}

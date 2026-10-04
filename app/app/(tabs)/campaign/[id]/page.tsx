"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowClockwise,
  CalendarBlank,
  CheckCircle,
  DownloadSimple,
  Eye,
  HourglassMedium,
  MagnifyingGlass,
  MapPin,
  PaperPlaneTilt,
  Plus,
  Users,
  WarningCircle,
  ClockCounterClockwise,
  Clock,
} from "@phosphor-icons/react";

import { KpiCardRow, type KpiItem } from "@/components/campaign/campaign-kpi-row";
import { CampaignDeliveryTable } from "@/components/campaign/campaign-delivery-table";
import { CampaignDetailSkeleton } from "@/components/campaign/campaign-detail-skeleton";
import type { StudentRecipient } from "@/components/campaign/campaign-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Delivery = {
  id: string;
  status: "QUEUED" | "SENDING" | "SENT" | "BOUNCED" | "FAILED" | "NOT_SENT";
  provider: string | null;
  providerMessageId: string | null;
  failureMessage: string | null;
  sentAt: string | null;
  queueJob: { status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER"; retryCount: number; scheduledAt: string } | null;
  attendee: { id: string; name: string; studentId: string; email: string; course: string | null; program: string | null };
  lastAttempt: { provider: string; providerMessageId: string | null; errorMessage: string | null; attemptedAt: string } | null;
};

type Campaign = {
  id: string;
  eventId?: string;
  subject: string;
  eventName: string;
  venue: string | null;
  startsAt: string;
  createdAt: string;
  campaignsCount?: number;
  totalStudents?: number;
  pendingCount?: number;
  counts: Record<Delivery["status"], number>;
  campaignsHistory?: Array<{ id: string; subject: string; createdAt: string; deliveredCount: number }>;
  deliveries: Delivery[];
};

type CampaignSubTab = "recipients" | "issues" | "history";

function recipientStatus(status: Delivery["status"]): StudentRecipient["deliveryStatus"] {
  if (status === "SENT") return "delivered";
  if (status === "QUEUED" || status === "SENDING") return "sending";
  if (status === "NOT_SENT") return "pending";
  return "invalid_email";
}

function displayProvider(provider: string | null): "Brevo" | undefined {
  if (provider === "BREVO") return "Brevo";
  return undefined;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = React.useState<Delivery | null>(null);
  const [retryConfirmationOpen, setRetryConfirmationOpen] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [retryMessage, setRetryMessage] = React.useState<string | null>(null);
  const [selectedPass, setSelectedPass] = React.useState<StudentRecipient | null>(null);
  const [passQrDataUrl, setPassQrDataUrl] = React.useState<string | null>(null);
  const [passError, setPassError] = React.useState<string | null>(null);
  const [selectedRequeue, setSelectedRequeue] = React.useState<StudentRecipient | null>(null);
  const [activeTab, setActiveTab] = React.useState<CampaignSubTab>("recipients");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | StudentRecipient["deliveryStatus"]>("all");
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState<string[]>([]);

  const refresh = React.useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
    const payload = await response.json() as { campaign?: Campaign; error?: string };
    if (!response.ok || !payload.campaign) throw new Error(payload.error ?? "We could not load this email announcement hub.");
    setCampaign(payload.campaign);
    setLoadError(null);
  }, [campaignId]);

  React.useEffect(() => {
    let active = true;
    const load = () => refresh().catch((error) => active && setLoadError(error instanceof Error ? error.message : "We could not load this email announcement hub."));
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5_000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [refresh]);

  const retry = async (deliveryIds: string[]) => {
    setRetrying(true);
    setRetryMessage(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/deliveries/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryIds }),
      });
      const payload = await response.json() as { queuedCount?: number; skippedCount?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not retry those emails.");
      setRetryMessage(payload.queuedCount ? `${payload.queuedCount} failed email${payload.queuedCount === 1 ? "" : "s"} returned to the send list.` : "Those emails are no longer available to retry.");
      setSelectedFailure(null);
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "We could not retry those emails.");
    } finally {
      setRetrying(false);
    }
  };

  const requeue = async () => {
    if (!selectedRequeue) return;
    setRetrying(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/deliveries/requeue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryIds: [selectedRequeue.id] }) });
      const payload = await response.json() as { queuedCount?: number; error?: string };
      if (!response.ok || !payload.queuedCount) throw new Error(payload.error ?? "We could not requeue this email.");
      setRetryMessage(`Email to ${selectedRequeue.name} returned to the send list.`);
      setSelectedRequeue(null);
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "We could not requeue this email.");
    } finally {
      setRetrying(false);
    }
  };

  const openPass = async (recipient: StudentRecipient) => {
    setSelectedPass(recipient);
    setPassQrDataUrl(null);
    setPassError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/deliveries/${recipient.id}/pass`);
      const payload = await response.json() as { qrDataUrl?: string; error?: string };
      if (!response.ok || !payload.qrDataUrl) throw new Error(payload.error ?? "We could not load this ticket.");
      setPassQrDataUrl(payload.qrDataUrl);
    } catch (error) {
      setPassError(error instanceof Error ? error.message : "We could not load this ticket.");
    }
  };

  const exportCsv = () => {
    if (!campaign) return;
    const headers = ["Student Name", "Student ID", "Email Address", "Course", "Delivery Status", "Delivered Timestamp", "Delivery Notes"];
    const escape = (value: string | null | undefined) => `"${(value ?? "").replaceAll('"', '""')}"`;
    const rows = campaign.deliveries.map((delivery) => [
      escape(delivery.attendee.name),
      escape(delivery.attendee.studentId),
      escape(delivery.attendee.email),
      escape(delivery.attendee.course),
      escape(recipientStatus(delivery.status)),
      escape(delivery.sentAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(delivery.sentAt)) : "Pending"),
      escape(delivery.failureMessage ?? delivery.lastAttempt?.errorMessage),
    ]);
    const blob = new Blob([[headers, ...rows].map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `email_delivery_report_${campaign.eventName.toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadError && !campaign) return <div role="alert" className="rounded-[12px] border border-red-border bg-red-soft p-6 text-sm text-red font-sans">{loadError}</div>;
  if (!campaign) return <CampaignDetailSkeleton />;

  const deliveredCount = campaign.deliveries.filter((d) => d.status === "SENT").length;
  const queued = campaign.deliveries.filter((d) => d.status === "QUEUED" || d.status === "SENDING").length;
  const failed = campaign.deliveries.filter((d) => d.status === "FAILED" || d.status === "BOUNCED").length;
  const pendingCount = campaign.pendingCount ?? campaign.deliveries.filter((d) => d.status === "NOT_SENT").length;

  const recipients: StudentRecipient[] = campaign.deliveries.map((delivery) => ({
    id: delivery.id,
    name: delivery.attendee.name,
    studentId: delivery.attendee.studentId,
    email: delivery.attendee.email,
    course: delivery.attendee.course ?? undefined,
    program: delivery.attendee.program ?? undefined,
    deliveryStatus: recipientStatus(delivery.status),
    deliveredAt: delivery.sentAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(delivery.sentAt)) : undefined,
    scheduledAt: delivery.queueJob?.scheduledAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(delivery.queueJob.scheduledAt)) : undefined,
    isSending: delivery.status === "SENDING",
    statusNote: delivery.failureMessage ?? delivery.lastAttempt?.errorMessage ?? undefined,
    provider: displayProvider(delivery.provider),
    messageId: delivery.providerMessageId ?? undefined,
  }));

  const kpis: KpiItem[] = [
    { label: "Delivered Emails", icon: <PaperPlaneTilt size={18} weight="bold" />, color: "var(--green)", data: [0, deliveredCount], format: (value) => `${Math.round(value)}` },
    { label: "Sending", icon: <HourglassMedium size={18} weight="bold" />, color: "var(--cyan)", data: [0, queued], format: (value) => `${Math.round(value)}` },
    { label: "Not Yet Emailed", icon: <Clock size={18} weight="bold" />, color: "var(--amber)", data: [0, pendingCount], format: (value) => `${Math.round(value)}` },
    { label: "Delivery Issues", icon: <WarningCircle size={18} weight="bold" />, color: "var(--red)", data: [0, failed], format: (value) => `${Math.round(value)}` },
  ];

  const failedDeliveries = campaign.deliveries.filter((delivery) => delivery.status === "FAILED");
  const filteredRecipients = recipients.filter((recipient) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || recipient.name.toLowerCase().includes(query) || recipient.studentId.toLowerCase().includes(query) || recipient.email.toLowerCase().includes(query);
    return matchesQuery && (statusFilter === "all" || recipient.deliveryStatus === statusFilter);
  });

  const selectedRecipients = recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id));
  const selectedFailedDeliveryIds = selectedRecipients.filter((recipient) => failedDeliveries.some((delivery) => delivery.id === recipient.id)).map((recipient) => recipient.id);
  const allVisibleSelected = filteredRecipients.length > 0 && filteredRecipients.every((recipient) => selectedRecipientIds.includes(recipient.id));

  const toggleRecipientSelection = (id: string) => {
    setSelectedRecipientIds((current) => current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]);
  };

  const toggleAllVisibleRecipients = () => {
    const visibleIds = new Set(filteredRecipients.map((recipient) => recipient.id));
    setSelectedRecipientIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.has(id)) : [...new Set([...current, ...visibleIds])]);
  };

  const reorderRecipients = (orderedRecipients: StudentRecipient[]) => {
    const deliveryById = new Map(campaign.deliveries.map((delivery) => [delivery.id, delivery]));
    const orderedIds = new Set(orderedRecipients.map((recipient) => recipient.id));
    let nextRecipientIndex = 0;
    setCampaign({
      ...campaign,
      deliveries: campaign.deliveries.map((delivery) => {
        if (!orderedIds.has(delivery.id)) return delivery;
        const nextRecipient = orderedRecipients[nextRecipientIndex++];
        return deliveryById.get(nextRecipient.id) ?? delivery;
      }),
    });
  };

  const handleSendNewAnnouncement = () => {
    router.push(`/campaign/new?eventId=${campaign.eventId ?? campaign.id}`);
  };

  return (
    <div className="flex w-full flex-col gap-6 pb-16 font-sans mt-5">
      {/* Top Event Communication Header */}
      <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-line bg-card p-4 shadow-xs lg:flex-row lg:items-center sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {campaign.eventName}
            </h1>
            <span className="rounded-full bg-canvas border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">
              {campaign.campaignsCount ?? (deliveredCount > 0 ? 1 : 0)} {(campaign.campaignsCount === 1 || deliveredCount > 0) ? "Announcement" : "Announcements"} Sent
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {campaign.venue && (
              <>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={16} className="text-cyan" aria-hidden="true" />
                  {campaign.venue}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarBlank size={16} className="text-cyan" aria-hidden="true" />
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.startsAt))}
            </span>
            <span aria-hidden="true">·</span>
            <span>Total registered: <strong className="font-semibold text-ink">{campaign.deliveries.length} students</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleSendNewAnnouncement}
            className="h-9 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white hover:bg-cyan-hover shadow-xs cursor-pointer"
          >
            <Plus size={16} weight="bold" className="text-white" aria-hidden="true" />
            <span>Send New Announcement</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => selectedRecipients.length === 1 && void openPass(selectedRecipients[0])}
            disabled={selectedRecipients.length !== 1}
            className="h-9 rounded-[6px] border-line px-3 text-xs font-semibold"
          >
            <Eye size={16} weight="bold" aria-hidden="true" /> View Selected Pass
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            className="h-9 rounded-[6px] border-line px-3 text-xs font-semibold"
          >
            <DownloadSimple size={16} weight="bold" aria-hidden="true" /> Export CSV
          </Button>
          {failedDeliveries.length > 0 && (
            <Button
              type="button"
              onClick={() => setRetryConfirmationOpen(true)}
              disabled={retrying}
              className="h-9 rounded-[6px] bg-red px-4 text-xs font-semibold text-white hover:bg-red-hover"
            >
              <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
              {retrying ? "Retrying..." : `Retry ${failedDeliveries.length} Failed`}
            </Button>
          )}
        </div>
      </div>

      {loadError && <p role="alert" className="text-sm text-red">{loadError}</p>}
      {retryMessage && (
        <p className="flex items-center gap-2 rounded-[9px] border border-green-border bg-green-soft p-3 text-sm text-green">
          <CheckCircle size={16} weight="bold" aria-hidden="true" />{retryMessage}
        </p>
      )}

      {/* Have Not Received Email Banner Action */}
      {pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-amber-border bg-amber-soft/50 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-amber-soft text-amber shrink-0 border border-amber-border">
              <HourglassMedium size={18} weight="bold" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-ink">
                {pendingCount} {pendingCount === 1 ? "student has" : "students have"} not yet received an announcement
              </h4>
              <p className="text-xs text-muted font-sans">
                Registered attendees waiting to receive their email announcement and check-in ticket pass.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSendNewAnnouncement}
            className="h-8.5 rounded-[6px] bg-amber hover:bg-amber-hover text-white text-xs font-semibold px-4 cursor-pointer shrink-0"
          >
            <PaperPlaneTilt size={14} weight="bold" className="text-white" />
            <span>Email {pendingCount} Remaining {pendingCount === 1 ? "Student" : "Students"}</span>
          </Button>
        </div>
      )}

      {/* KPI Row */}
      <KpiCardRow items={kpis} />

      {/* Navigation SubTabs */}
      <nav aria-label="Campaign view options" className="sticky top-16 z-20 flex flex-col justify-between gap-3 rounded-[12px] border-b border-line-subtle bg-paper/95 px-2 py-1.5 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab("recipients")}
            className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors cursor-pointer", activeTab === "recipients" ? "bg-ink text-paper shadow-xs" : "text-muted hover:bg-canvas hover:text-ink")}
          >
            <Users size={16} weight={activeTab === "recipients" ? "bold" : "regular"} aria-hidden="true" />
            All Students ({recipients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("issues")}
            className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors cursor-pointer", activeTab === "issues" ? "bg-ink text-paper shadow-xs" : "text-muted hover:bg-canvas hover:text-ink")}
          >
            <WarningCircle size={16} weight={activeTab === "issues" ? "bold" : "regular"} aria-hidden="true" />
            Delivery Issues ({failed})
          </button>
          {campaign.campaignsHistory && campaign.campaignsHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors cursor-pointer", activeTab === "history" ? "bg-ink text-paper shadow-xs" : "text-muted hover:bg-canvas hover:text-ink")}
            >
              <ClockCounterClockwise size={16} weight={activeTab === "history" ? "bold" : "regular"} aria-hidden="true" />
              Broadcast History ({campaign.campaignsHistory.length})
            </button>
          )}
        </div>
        <span className="px-2 text-xs font-medium text-muted">Status refreshes live.</span>
      </nav>

      {/* 1. All Recipients Tab */}
      {activeTab === "recipients" && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, student ID, or email"
                className="h-9 rounded-[6px] border-line bg-card pl-9 text-xs"
              />
            </div>
            <div className="inline-flex w-full overflow-x-auto rounded-[9px] border border-line bg-canvas/60 p-0.5 text-xs sm:w-auto">
              {(["all", "delivered", "pending", "sending", "invalid_email"] as const).map((filter) => {
                const count = filter === "all"
                  ? recipients.length
                  : recipients.filter((recipient) => recipient.deliveryStatus === filter).length;
                const label = filter === "all"
                  ? `All (${count})`
                  : filter === "delivered"
                  ? `Delivered (${count})`
                  : filter === "sending"
                  ? `Sending (${count})`
                  : filter === "pending"
                  ? `Not Yet Emailed (${count})`
                  : `Needs Help (${count})`;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={cn("shrink-0 rounded-[6px] px-3 py-1.5 font-medium transition-colors cursor-pointer", statusFilter === filter ? "bg-card font-bold text-ink shadow-xs" : "text-muted hover:text-ink")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRecipientIds.length > 0 && (
            <div className="flex flex-col justify-between gap-3 rounded-[9px] border border-cyan-border bg-cyan-soft/40 p-3 sm:flex-row sm:items-center">
              <p className="text-xs font-medium text-ink">
                <span className="font-bold text-cyan">{selectedRecipientIds.length}</span> student{selectedRecipientIds.length === 1 ? "" : "s"} selected{selectedFailedDeliveryIds.length !== selectedRecipientIds.length && ". Only failed emails can be retried."}
              </p>
              <div className="flex items-center gap-2">
                {selectedFailedDeliveryIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => void retry(selectedFailedDeliveryIds)}
                    disabled={retrying}
                    className="h-8 rounded-[6px] bg-cyan px-3 text-xs font-semibold text-white hover:bg-cyan-hover"
                  >
                    <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
                    Retry Failed ({selectedFailedDeliveryIds.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRecipientIds([])}
                  className="h-8 rounded-[6px] px-2 text-xs text-muted hover:text-ink"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <CampaignDeliveryTable
            recipients={filteredRecipients}
            selectedIds={selectedRecipientIds}
            onToggleSelect={toggleRecipientSelection}
            onToggleSelectAll={toggleAllVisibleRecipients}
            onReorder={reorderRecipients}
            retryableIds={failedDeliveries.map((delivery) => delivery.id)}
            onResend={(deliveryId) => void retry([deliveryId])}
            onRequeue={setSelectedRequeue}
            onViewPass={(recipient) => void openPass(recipient)}
            eventName={campaign.eventName}
            venue={campaign.venue ?? undefined}
            eventDate={new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.startsAt))}
          />
        </section>
      )}

      {/* 2. Delivery Issues Tab */}
      {activeTab === "issues" && (
        <section className="rounded-[12px] border border-line bg-card p-4 shadow-xs sm:p-5">
          <h2 className="font-display text-xl font-bold text-ink">Delivery Issues</h2>
          <p className="mt-1 text-xs text-muted">Review failed emails before returning them to the send list.</p>
          <div className="mt-4 divide-y divide-line-subtle">
            {campaign.deliveries.filter((delivery) => delivery.status === "FAILED" || delivery.status === "BOUNCED").map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{delivery.attendee.name}</p>
                  <p className="text-xs text-muted">{delivery.failureMessage ?? delivery.lastAttempt?.errorMessage ?? "This email could not be delivered."}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedFailure(delivery)}
                  className="h-8 rounded-[6px] border-line text-xs font-semibold"
                >
                  Review
                </Button>
              </div>
            ))}
            {failed === 0 && <p className="py-5 text-sm text-muted">No delivery issues need attention.</p>}
          </div>
        </section>
      )}

      {/* 3. Broadcast History Tab */}
      {activeTab === "history" && (
        <section className="rounded-[12px] border border-line bg-card p-4 shadow-xs sm:p-5">
          <h2 className="font-display text-xl font-bold text-ink">Broadcast History</h2>
          <p className="mt-1 text-xs text-muted">All email announcements sent for {campaign.eventName}.</p>
          <div className="mt-4 divide-y divide-line-subtle">
            {(campaign.campaignsHistory ?? []).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-cyan-soft text-cyan font-bold text-xs font-display">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.subject}</p>
                    <p className="text-xs text-muted">
                      Sent on {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))} · <strong className="text-ink font-semibold">{item.deliveredCount}</strong> delivered
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(!campaign.campaignsHistory || campaign.campaignsHistory.length === 0) && (
              <p className="py-5 text-sm text-muted">No past email broadcasts recorded yet.</p>
            )}
          </div>
        </section>
      )}

      {/* Dialogs */}
      <Dialog open={selectedFailure !== null} onOpenChange={(open) => !open && setSelectedFailure(null)}>
        <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
          <DialogTitle className="font-display text-xl font-bold text-ink">Delivery Details</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">{selectedFailure?.attendee.name} · {selectedFailure?.attendee.email}</DialogDescription>
          <div className="mt-4 rounded-[9px] border border-red-border bg-red-soft p-3 text-sm text-red">{selectedFailure?.failureMessage ?? selectedFailure?.lastAttempt?.errorMessage ?? "This email could not be delivered."}</div>
          <p className="text-xs text-muted">Last checked {selectedFailure?.lastAttempt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedFailure.lastAttempt.attemptedAt)) : "before the first provider response"}.</p>
          {selectedFailure?.status === "FAILED" && <Button type="button" onClick={() => void retry([selectedFailure.id])} disabled={retrying} className="h-9 rounded-[6px] bg-cyan text-xs font-semibold text-white hover:bg-cyan-hover"><ArrowClockwise size={16} weight="bold" aria-hidden="true" /> Retry Failed Email</Button>}
        </DialogContent>
      </Dialog>
      <Dialog open={retryConfirmationOpen} onOpenChange={setRetryConfirmationOpen}>
        <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
          <DialogTitle className="font-display text-xl font-bold text-ink">Retry failed emails?</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">This returns {failedDeliveries.length} failed email{failedDeliveries.length === 1 ? "" : "s"} to the send list. Delivered emails will not be sent again.</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRetryConfirmationOpen(false)} className="h-9 rounded-[6px] border-line text-xs font-semibold">Cancel</Button>
            <Button type="button" onClick={() => void retry(failedDeliveries.map((delivery) => delivery.id))} disabled={retrying} className="h-9 rounded-[6px] bg-cyan text-xs font-semibold text-white hover:bg-cyan-hover"><ArrowClockwise size={16} weight="bold" aria-hidden="true" /> Confirm Retry</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={selectedPass !== null} onOpenChange={(open) => !open && setSelectedPass(null)}>
        <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
          <DialogTitle className="font-display text-xl font-bold text-ink">Check-in Pass</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">{selectedPass?.name} · {campaign.eventName}</DialogDescription>
          {passError && <p role="alert" className="mt-4 rounded-[9px] border border-red-border bg-red-soft p-3 text-sm text-red">{passError}</p>}
          {!passError && !passQrDataUrl && <p className="mt-4 text-sm text-muted">Loading ticket...</p>}
          {passQrDataUrl && <div className="mt-4 flex flex-col items-center gap-3 rounded-[12px] border border-line bg-paper p-5"><img src={passQrDataUrl} alt={`Check-in QR ticket for ${selectedPass?.name}`} className="h-56 w-56 rounded-[6px]" /><p className="text-xs font-semibold text-green">Ready for check-in during the event window.</p></div>}
        </DialogContent>
      </Dialog>
      <Dialog open={selectedRequeue !== null} onOpenChange={(open) => !open && setSelectedRequeue(null)}>
        <DialogContent className="max-w-md rounded-[12px] border-line bg-card p-6 font-sans">
          <DialogTitle className="font-display text-xl font-bold text-ink">Requeue this email?</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">This will send {selectedRequeue?.name} another copy of this campaign.</DialogDescription>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSelectedRequeue(null)} className="h-9 rounded-[6px] border-line text-xs font-semibold">Cancel</Button><Button type="button" onClick={() => void requeue()} disabled={retrying} className="h-9 rounded-[6px] bg-cyan text-xs font-semibold text-white hover:bg-cyan-hover"><ArrowClockwise size={16} weight="bold" aria-hidden="true" />{retrying ? "Requeueing..." : "Requeue Email"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowClockwise, CheckCircle, HourglassMedium, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";

import { KpiCardRow, type KpiItem } from "@/components/campaign/campaign-kpi-row";
import { CampaignDeliveryTable } from "@/components/campaign/campaign-delivery-table";
import type { StudentRecipient } from "@/components/campaign/campaign-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Delivery = {
  id: string;
  status: "QUEUED" | "SENDING" | "SENT" | "BOUNCED" | "FAILED";
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
  subject: string;
  eventName: string;
  venue: string | null;
  startsAt: string;
  createdAt: string;
  counts: Record<Delivery["status"], number>;
  deliveries: Delivery[];
};

function recipientStatus(status: Delivery["status"]): StudentRecipient["deliveryStatus"] {
  if (status === "SENT") return "delivered";
  if (status === "QUEUED" || status === "SENDING") return "sending";
  return "invalid_email";
}

function displayProvider(provider: string | null): "Brevo" | undefined {
  if (provider === "BREVO") return "Brevo";
  return undefined;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  const refresh = React.useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
    const payload = await response.json() as { campaign?: Campaign; error?: string };
    if (!response.ok || !payload.campaign) throw new Error(payload.error ?? "We could not load this email campaign.");
    setCampaign(payload.campaign);
    setLoadError(null);
  }, [campaignId]);

  React.useEffect(() => {
    let active = true;
    const load = () => refresh().catch((error) => active && setLoadError(error instanceof Error ? error.message : "We could not load this email campaign."));
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

  if (loadError && !campaign) return <div role="alert" className="rounded-[12px] border border-red-border bg-red-soft p-6 text-sm text-red font-sans">{loadError}</div>;
  if (!campaign) return <div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted font-sans">Loading email campaign...</div>;

  const queued = campaign.counts.QUEUED + campaign.counts.SENDING;
  const failed = campaign.counts.FAILED + campaign.counts.BOUNCED;
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
    { label: "Delivered Emails", icon: <PaperPlaneTilt size={18} weight="bold" />, color: "var(--green)", data: [0, campaign.counts.SENT], format: (value) => `${Math.round(value)}` },
    { label: "Waiting to Send", icon: <HourglassMedium size={18} weight="bold" />, color: "var(--amber)", data: [0, queued], format: (value) => `${Math.round(value)}` },
    { label: "Needs Attention", icon: <WarningCircle size={18} weight="bold" />, color: "var(--red)", data: [0, failed], format: (value) => `${Math.round(value)}` },
  ];
  const failedDeliveries = campaign.deliveries.filter((delivery) => delivery.status === "FAILED");

  return (
    <div className="flex w-full flex-col gap-6 pb-16 font-sans">
      <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-line bg-card p-4 shadow-xs lg:flex-row lg:items-center sm:p-6">
        <div>
          <button type="button" onClick={() => router.push("/campaign")} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" /> All Announcements
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{campaign.subject}</h1>
          <p className="mt-1 text-xs text-muted">Sent for <strong className="font-semibold text-ink">{campaign.eventName}</strong> on {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(campaign.createdAt))}</p>
        </div>
        {failedDeliveries.length > 0 && <Button type="button" onClick={() => setRetryConfirmationOpen(true)} disabled={retrying} className="h-9 rounded-[6px] bg-cyan px-4 text-xs font-semibold text-white hover:bg-cyan-hover">
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" /> {retrying ? "Retrying..." : `Retry ${failedDeliveries.length} Failed Email${failedDeliveries.length === 1 ? "" : "s"}`}
        </Button>}
      </div>

      {loadError && <p role="alert" className="text-sm text-red">{loadError}</p>}
      {retryMessage && <p className="flex items-center gap-2 rounded-[9px] border border-green-border bg-green-soft p-3 text-sm text-green"><CheckCircle size={16} weight="bold" aria-hidden="true" />{retryMessage}</p>}
      <KpiCardRow items={kpis} />

      <section className="rounded-[12px] border border-line bg-card p-4 shadow-xs sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div><h2 className="font-display text-xl font-bold text-ink">Recipients</h2><p className="text-xs text-muted">Delivery status refreshes while this page is open.</p></div>
          <span className="text-xs font-semibold text-muted">{campaign.deliveries.length} recipients</span>
        </div>
        <CampaignDeliveryTable recipients={recipients} retryableIds={failedDeliveries.map((delivery) => delivery.id)} onResend={(deliveryId) => { const delivery = campaign.deliveries.find((item) => item.id === deliveryId); if (delivery?.status === "FAILED") void retry([delivery.id]); }} onRequeue={setSelectedRequeue} onViewPass={(recipient) => void openPass(recipient)} eventName={campaign.eventName} venue={campaign.venue ?? undefined} eventDate={new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.startsAt))} />
      </section>

      <section className="rounded-[12px] border border-line bg-card p-4 shadow-xs sm:p-5">
        <h2 className="font-display text-xl font-bold text-ink">Delivery Issues</h2>
        <p className="mt-1 text-xs text-muted">Review failed emails before returning them to the send list.</p>
        <div className="mt-4 divide-y divide-line-subtle">
          {campaign.deliveries.filter((delivery) => delivery.status === "FAILED" || delivery.status === "BOUNCED").map((delivery) => <div key={delivery.id} className="flex items-center justify-between gap-4 py-3">
            <div><p className="text-sm font-semibold text-ink">{delivery.attendee.name}</p><p className="text-xs text-muted">{delivery.failureMessage ?? delivery.lastAttempt?.errorMessage ?? "This email could not be delivered."}</p></div>
            <Button type="button" variant="outline" onClick={() => setSelectedFailure(delivery)} className="h-8 rounded-[6px] border-line text-xs font-semibold">Review</Button>
          </div>)}
          {failed === 0 && <p className="py-5 text-sm text-muted">No delivery issues need attention.</p>}
        </div>
      </section>

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

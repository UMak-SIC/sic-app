"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowClockwise,
  DownloadSimple,
  MagnifyingGlass,
  CheckCircle,
  HourglassMedium,
  WarningCircle,
  CalendarBlank,
  MapPin,
  Eye,
  Users,
  Lightning,
  ArrowLeft,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import { getCampaignById } from "@/components/campaign/campaign-data";
import { CampaignSummary, StudentRecipient } from "@/components/campaign/campaign-types";
import { KpiCardRow, KpiItem } from "@/components/campaign/campaign-kpi-row";
import { CampaignDeliveryTable } from "@/components/campaign/campaign-delivery-table";
import { CampaignDeliveryQueue } from "@/components/campaign/campaign-delivery-queue";
import { CampaignDeliveryDiagnostics } from "@/components/campaign/campaign-delivery-diagnostics";
import {
  CampaignSendingLimitsDialog,
  SendingLimitsTriggerButton,
} from "@/components/campaign/campaign-sending-limits-dialog";
import { CampaignPreviewDialog } from "@/components/campaign/campaign-preview-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CampaignSubTab = "recipients" | "queue" | "diagnostics";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const campaignId = rawId as string;

  // Initialize campaign state
  const initialData = React.useMemo(() => {
    return getCampaignById(campaignId) || getCampaignById("cmp_1")!;
  }, [campaignId]);

  const [campaign, setCampaign] = React.useState<CampaignSummary>(initialData);
  const [activeTab, setActiveTab] = React.useState<CampaignSubTab>("recipients");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "delivered" | "sending" | "invalid_email"
  >("all");
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isLimitsOpen, setIsLimitsOpen] = React.useState(false);

  // Sync state if id param changes
  React.useEffect(() => {
    const data = getCampaignById(campaignId) || getCampaignById("cmp_1")!;
    setCampaign(data);
  }, [campaignId]);

  const deliveryPercent = Math.round(
    (campaign.deliveredCount / (campaign.totalStudents || 1)) * 100
  );

  // Filtered recipient list
  const filteredRecipients = campaign.recipients.filter((student) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      student.name.toLowerCase().includes(q) ||
      student.studentId.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" || student.deliveryStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // KPI Items customized for this campaign
  const kpiItems: KpiItem[] = React.useMemo(() => {
    return [
      {
        label: "Delivered Emails",
        icon: <PaperPlaneTilt size={18} weight="bold" />,
        color: "var(--green)",
        format: (v) => `${Math.round(v)} / ${campaign.totalStudents}`,
        delta: `+${deliveryPercent}%`,
        up: true,
        data: [42, 58, 65, 76, 82, 91, 95, 102, 106, campaign.deliveredCount],
      },
      {
        label: "Currently Sending",
        icon: <HourglassMedium size={18} weight="bold" />,
        color: "var(--amber)",
        format: (v) => `${Math.round(v)}`,
        delta: `${campaign.sendingCount} in queue`,
        up: false,
        data: [24, 20, 18, 15, 12, 10, 8, 7, 6, campaign.sendingCount],
      },
      {
        label: "Needs Attention",
        icon: <WarningCircle size={18} weight="bold" />,
        color: "var(--red)",
        format: (v) => `${Math.round(v)}`,
        delta: `${campaign.invalidEmailCount} to fix`,
        up: false,
        data: [8, 7, 6, 5, 5, 4, 4, 3, 3, campaign.invalidEmailCount],
      },
    ];
  }, [campaign.deliveredCount, campaign.sendingCount, campaign.invalidEmailCount, campaign.totalStudents, deliveryPercent]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredRecipients.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredRecipients.map((r) => r.id));
    }
  };

  // Reorder Handler
  const handleReorderRecipients = (reordered: StudentRecipient[]) => {
    setCampaign((prev) => ({
      ...prev,
      recipients: reordered,
    }));
  };

  // Bulk Resend to All Undelivered
  const handleResendAll = () => {
    setIsResending(true);
    setResendSuccessMessage(null);
    setTimeout(() => {
      setIsResending(false);
      const updatedRecipients: StudentRecipient[] = campaign.recipients.map((s) => {
        if (s.deliveryStatus === "sending" || s.deliveryStatus === "invalid_email") {
          return {
            ...s,
            deliveryStatus: "delivered",
            deliveredAt: "Just now",
            statusNote: undefined,
          };
        }
        return s;
      });

      setCampaign((prev) => ({
        ...prev,
        deliveredCount: prev.totalStudents,
        sendingCount: 0,
        invalidEmailCount: 0,
        recipients: updatedRecipients,
      }));

      setResendSuccessMessage("Successfully resent emails to all undelivered students!");
      setTimeout(() => setResendSuccessMessage(null), 5000);
    }, 1000);
  };

  // Bulk Resend to Selected
  const handleResendSelected = () => {
    if (selectedStudentIds.length === 0) return;
    setIsResending(true);
    setResendSuccessMessage(null);

    setTimeout(() => {
      setIsResending(false);
      const updatedRecipients: StudentRecipient[] = campaign.recipients.map((s) => {
        if (selectedStudentIds.includes(s.id)) {
          return {
            ...s,
            deliveryStatus: "delivered",
            deliveredAt: "Just now",
            statusNote: undefined,
          };
        }
        return s;
      });

      const delivered = updatedRecipients.filter((s) => s.deliveryStatus === "delivered").length;
      const sending = updatedRecipients.filter((s) => s.deliveryStatus === "sending").length;
      const invalid = updatedRecipients.filter((s) => s.deliveryStatus === "invalid_email").length;

      setCampaign((prev) => ({
        ...prev,
        deliveredCount: Math.min(prev.totalStudents, delivered),
        sendingCount: sending,
        invalidEmailCount: invalid,
        recipients: updatedRecipients,
      }));

      setResendSuccessMessage(`Successfully resent emails to ${selectedStudentIds.length} selected students!`);
      setSelectedStudentIds([]);
      setTimeout(() => setResendSuccessMessage(null), 5000);
    }, 900);
  };

  // Single Recipient Resend
  const handleSingleResend = (studentId: string) => {
    setCampaign((prev) => {
      const updated = prev.recipients.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            deliveryStatus: "delivered" as const,
            deliveredAt: "Just now",
            statusNote: undefined,
          };
        }
        return s;
      });

      const delivered = updated.filter((s) => s.deliveryStatus === "delivered").length;
      const sending = updated.filter((s) => s.deliveryStatus === "sending").length;
      const invalid = updated.filter((s) => s.deliveryStatus === "invalid_email").length;

      return {
        ...prev,
        deliveredCount: Math.min(prev.totalStudents, delivered),
        sendingCount: sending,
        invalidEmailCount: invalid,
        recipients: updated,
      };
    });

    setResendSuccessMessage("Email resent successfully!");
    setTimeout(() => setResendSuccessMessage(null), 4000);
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = [
      "Student Name",
      "Student ID",
      "Email Address",
      "Course",
      "Delivery Status",
      "Delivered Timestamp",
      "Delivery Notes",
    ];
    const rows = campaign.recipients.map((s) => [
      `"${s.name}"`,
      `"${s.studentId}"`,
      `"${s.email}"`,
      `"${s.course || "BSIT"}"`,
      `"${s.deliveryStatus}"`,
      `"${s.deliveredAt || "Pending"}"`,
      `"${s.statusNote || "None"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `email_delivery_report_${campaign.eventName.toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16 font-sans">
      {/* 1. Page Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-[16px] border border-line shadow-xs">
        <div>
          <button
            type="button"
            onClick={() => router.push("/campaign")}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink font-medium mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>All Announcements</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight leading-snug">
            {campaign.subject}
          </h1>

          <p className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap font-sans">
            <span>
              Sent for <strong className="text-ink font-semibold">{campaign.eventName}</strong> on {campaign.sentDate}
            </span>
            {campaign.venue && (
              <>
                <span className="text-muted-light">·</span>
                <span className="flex items-center gap-1 text-muted">
                  <MapPin size={13} className="text-cyan shrink-0" />
                  {campaign.venue}
                </span>
              </>
            )}
            {campaign.eventDate && (
              <>
                <span className="text-muted-light">·</span>
                <span className="flex items-center gap-1 text-muted">
                  <CalendarBlank size={13} className="text-cyan shrink-0" />
                  {campaign.eventDate}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="text-xs font-semibold rounded-[6px] h-9 px-3.5 gap-1.5 cursor-pointer bg-card hover:bg-canvas"
          >
            <Eye size={15} />
            <span>View Ticket Pass</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="text-xs font-semibold rounded-[6px] h-9 px-3.5 gap-1.5 cursor-pointer bg-card hover:bg-canvas"
          >
            <DownloadSimple size={15} />
            <span>Export CSV</span>
          </Button>

          {campaign.invalidEmailCount > 0 || campaign.sendingCount > 0 ? (
            <Button
              type="button"
              onClick={handleResendAll}
              disabled={isResending}
              className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowClockwise size={14} className={cn(isResending && "animate-spin")} weight="bold" />
              <span>{isResending ? "Resending..." : "Resend Undelivered"}</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleResendAll}
              disabled={isResending}
              className="text-xs font-semibold rounded-[6px] h-9 px-3.5 gap-1.5 cursor-pointer bg-card hover:bg-canvas text-muted hover:text-ink"
            >
              <ArrowClockwise size={14} className={cn(isResending && "animate-spin")} />
              <span>Resend to All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {resendSuccessMessage && (
        <div className="p-3.5 rounded-[9px] bg-green-soft border border-green-border flex items-center justify-between text-xs text-green font-medium animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} weight="bold" className="shrink-0" />
            <span>{resendSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setResendSuccessMessage(null)}
            className="text-green hover:underline cursor-pointer font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Original Animated KPI Sparkline Cards Row */}
      <KpiCardRow items={kpiItems} />

      {/* 3. Fluid Segmented Switcher + Sending Limits Green Gradient Button on the Right */}
      <nav
        aria-label="Campaign view options"
        className="sticky top-16 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-line-subtle bg-paper/95 backdrop-blur py-1.5 px-2 rounded-[12px]"
      >
        {/* Left: View Tabs */}
        <ul className="flex items-center gap-1.5 flex-wrap">
          <li>
            <button
              type="button"
              onClick={() => setActiveTab("recipients")}
              className={cn(
                "inline-flex h-8.5 items-center gap-2 rounded-full px-4 font-sans text-xs font-semibold transition-colors cursor-pointer",
                activeTab === "recipients"
                  ? "bg-ink text-paper shadow-2xs font-bold"
                  : "text-muted hover:bg-canvas hover:text-ink"
              )}
            >
              <Users size={15} weight={activeTab === "recipients" ? "bold" : "regular"} />
              <span>All Recipients ({campaign.recipients.length})</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={cn(
                "inline-flex h-8.5 items-center gap-2 rounded-full px-4 font-sans text-xs font-semibold transition-colors cursor-pointer",
                activeTab === "queue"
                  ? "bg-ink text-paper shadow-2xs font-bold"
                  : "text-muted hover:bg-canvas hover:text-ink"
              )}
            >
              <Lightning size={15} weight={activeTab === "queue" ? "bold" : "regular"} />
              <span>Queue & Capacity</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab("diagnostics")}
              className={cn(
                "inline-flex h-8.5 items-center gap-2 rounded-full px-4 font-sans text-xs font-semibold transition-colors cursor-pointer",
                activeTab === "diagnostics"
                  ? "bg-ink text-paper shadow-2xs font-bold"
                  : "text-muted hover:bg-canvas hover:text-ink"
              )}
            >
              <WarningCircle size={15} weight={activeTab === "diagnostics" ? "bold" : "regular"} />
              <span>Delivery Issues ({campaign.invalidEmailCount})</span>
            </button>
          </li>
        </ul>

        {/* Right: Sending Limits Button (Green Gradient Modal Trigger) */}
        <div className="flex items-center justify-end">
          <SendingLimitsTriggerButton onClick={() => setIsLimitsOpen(true)} />
        </div>
      </nav>

      {/* 4. Tab Panel 1: All Recipients (Events Table format) */}
      {activeTab === "recipients" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Search, Filter Toolbar & Bulk Selection Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name, ID or email..."
                className="pl-9 h-9 text-xs bg-card rounded-[8px] border-line font-sans"
              />
            </div>

            <div className="inline-flex rounded-[8px] border border-line p-0.5 bg-canvas/60 text-xs w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs shrink-0",
                  statusFilter === "all"
                    ? "bg-card text-ink font-bold shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                All ({campaign.recipients.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("delivered")}
                className={cn(
                  "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs shrink-0",
                  statusFilter === "delivered"
                    ? "bg-card text-green font-bold shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                Delivered ({campaign.recipients.filter((r) => r.deliveryStatus === "delivered").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("sending")}
                className={cn(
                  "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs shrink-0",
                  statusFilter === "sending"
                    ? "bg-card text-cyan font-bold shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                Sending ({campaign.recipients.filter((r) => r.deliveryStatus === "sending").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("invalid_email")}
                className={cn(
                  "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs shrink-0",
                  statusFilter === "invalid_email"
                    ? "bg-card text-red font-bold shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                Needs Help ({campaign.recipients.filter((r) => r.deliveryStatus === "invalid_email").length})
              </button>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedStudentIds.length > 0 && (
            <div className="p-3 bg-cyan-soft/40 border border-cyan-border rounded-[10px] flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs text-ink font-medium">
                <span className="font-bold text-cyan">{selectedStudentIds.length}</span>
                <span>students selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleResendSelected}
                  disabled={isResending}
                  className="h-7.5 bg-cyan hover:bg-cyan-hover text-white rounded-[6px] px-3 text-xs gap-1 cursor-pointer font-semibold shadow-2xs"
                >
                  <ArrowClockwise size={13} className={cn(isResending && "animate-spin")} weight="bold" />
                  <span>Resend to Selected</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStudentIds([])}
                  className="h-7.5 text-xs text-muted hover:text-ink rounded-[6px] px-2 cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* The Rich Delivery Table formatted like events-table.tsx */}
          <CampaignDeliveryTable
            recipients={filteredRecipients}
            selectedIds={selectedStudentIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onReorder={handleReorderRecipients}
            onResend={handleSingleResend}
            onViewPass={() => setIsPreviewOpen(true)}
            eventName={campaign.eventName}
            venue={campaign.venue}
            eventDate={campaign.eventDate}
          />
        </div>
      )}

      {/* 5. Tab Panel 2: Queue & Capacity */}
      {activeTab === "queue" && (
        <div className="animate-in fade-in duration-150">
          <CampaignDeliveryQueue
            eventName={campaign.eventName}
            queueBreakdown={campaign.queueBreakdown}
            providers={campaign.providers}
          />
        </div>
      )}

      {/* 6. Tab Panel 3: Delivery Issues & Diagnostics */}
      {activeTab === "diagnostics" && (
        <div className="animate-in fade-in duration-150">
          <CampaignDeliveryDiagnostics
            eventName={campaign.eventName}
            diagnostics={campaign.diagnostics}
            onRetryNow={handleResendAll}
          />
        </div>
      )}

      {/* 7. Ticket Pass Preview Modal */}
      <CampaignPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        subject={campaign.subject}
        eventName={campaign.eventName}
        venue={campaign.venue}
        eventDate={campaign.eventDate}
        bannerImageName={campaign.bannerImageName}
        studentCount={campaign.totalStudents}
      />

      {/* 8. Sending Limits & Multi-Provider Failover Modal */}
      <CampaignSendingLimitsDialog
        open={isLimitsOpen}
        onOpenChange={setIsLimitsOpen}
        providers={campaign.providers}
      />
    </div>
  );
}

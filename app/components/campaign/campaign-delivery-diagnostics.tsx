"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import { DeliveryDiagnosticItem } from "./campaign-types";
import {
  DotsThreeVertical,
  DotsSixVertical,
  CheckCircle,
  Clock,
  HourglassMedium,
  WarningCircle,
  XCircle,
  ArrowClockwise,
  MagnifyingGlass,
  ShieldCheck,
  CalendarBlank,
  Copy,
  Eye,
  ArrowUp,
  ArrowDown,
  Check,
  Lightning,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface CampaignDeliveryDiagnosticsProps {
  eventName?: string;
  diagnostics?: DeliveryDiagnosticItem[];
  onRetryNow?: () => void;
  className?: string;
}

const DEFAULT_DIAGNOSTICS: DeliveryDiagnosticItem[] = [
  {
    id: "diag_1",
    recipientName: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    provider: "Mailgun",
    messageId: "Ref #7D31",
    status: "sent",
    statusDescription: "Delivered to student inbox",
    idempotencyKey: "Protected against duplicates",
    lastAttemptTime: "14 Oct 2026, 09:14 AM",
  },
  {
    id: "diag_2",
    recipientName: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    provider: "Brevo",
    scheduledRetry: "Tonight at 00:05",
    status: "queued",
    statusDescription: "Waiting for midnight reset window",
    idempotencyKey: "Protected against duplicates",
    lastAttemptTime: "14 Oct 2026, 09:14 AM",
  },
  {
    id: "diag_3",
    recipientName: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    provider: "Mailgun",
    messageId: "Ref #7D88",
    status: "bounced",
    statusDescription: "Student email inbox is full or unavailable",
    idempotencyKey: "Protected against duplicates",
    lastAttemptTime: "14 Oct 2026, 09:15 AM",
  },
  {
    id: "diag_4",
    recipientName: "Joshua Ramos",
    studentId: "2022-01934",
    email: "joshua.ramos@umak.edu.ph",
    provider: "Mailgun",
    messageId: "Ref #7D33",
    status: "sent",
    statusDescription: "Delivered to student inbox",
    idempotencyKey: "Protected against duplicates",
    lastAttemptTime: "14 Oct 2026, 09:15 AM",
  },
  {
    id: "diag_5",
    recipientName: "Mark Bautista",
    studentId: "2021-03412",
    email: "mark.bautista@umak.edu.ph",
    provider: "Mailgun",
    status: "failed",
    statusDescription: "Please check student email address spelling",
    idempotencyKey: "Protected against duplicates",
    lastAttemptTime: "14 Oct 2026, 09:16 AM",
  },
];

const STATUS_ACCENTS: Record<
  DeliveryDiagnosticItem["status"],
  {
    borderLeftClass: string;
    label: string;
    badgeBg: string;
    icon: React.ElementType;
  }
> = {
  sent: {
    borderLeftClass: "border-l-green",
    label: "Delivered",
    badgeBg: "bg-green-soft text-green border-green-border",
    icon: CheckCircle,
  },
  queued: {
    borderLeftClass: "border-l-amber",
    label: "Waiting in Queue",
    badgeBg: "bg-amber-soft text-amber border-amber-border",
    icon: HourglassMedium,
  },
  bounced: {
    borderLeftClass: "border-l-red",
    label: "Bounced",
    badgeBg: "bg-red-soft text-red border-red-border",
    icon: XCircle,
  },
  failed: {
    borderLeftClass: "border-l-red",
    label: "Needs Help",
    badgeBg: "bg-red-soft text-red border-red-border",
    icon: WarningCircle,
  },
};

export function ProviderBadge({
  provider,
  messageId,
}: {
  provider: "Mailgun" | "Brevo" | string;
  messageId?: string;
}) {
  if (provider === "Mailgun") {
    return (
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-[5px] bg-red-soft text-red flex items-center justify-center shrink-0 border border-red-border shadow-2xs">
          <PaperPlaneTilt size={12} weight="bold" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display font-bold text-xs text-ink leading-tight">
            Mailgun
          </span>
          {messageId ? (
            <span className="font-mono text-[10px] text-muted truncate">
              {messageId}
            </span>
          ) : (
            <span className="text-[10px] text-muted-light">Primary</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="size-6 rounded-[5px] bg-green-soft text-green flex items-center justify-center shrink-0 border border-green-border shadow-2xs">
        <Lightning size={12} weight="bold" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-display font-bold text-xs text-ink leading-tight">
          Brevo
        </span>
        <span className="text-[10px] text-muted truncate">
          Backup Sender
        </span>
      </div>
    </div>
  );
}

export function CampaignDeliveryDiagnostics({
  eventName = "UMak SIC General Assembly",
  diagnostics = DEFAULT_DIAGNOSTICS,
  onRetryNow,
  className,
}: CampaignDeliveryDiagnosticsProps) {
  const reduced = useReducedMotion();
  const wrap = React.useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  const [items, setItems] = React.useState<DeliveryDiagnosticItem[]>(diagnostics);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "issues_only" | "queued" | "sent">("all");
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"top" | "bottom" | null>(null);

  React.useEffect(() => {
    setItems(diagnostics);
  }, [diagnostics]);

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) {
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map((d) => d.id));
    }
  };

  const handleReorder = (newItems: DeliveryDiagnosticItem[]) => {
    setItems(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index - 1, 0, moved);
    handleReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index + 1, 0, moved);
    handleReorder(newItems);
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setHoverIndex(null);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const targetRow = e.currentTarget;
    const rect = targetRow.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTop = relativeY < rect.height / 2;

    setDragOverIndex(index);
    setDropPosition(isTop ? "top" : "bottom");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);

    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex && dropPosition === "top") {
      insertIndex = targetIndex - 1;
    } else if (draggedIndex > targetIndex && dropPosition === "bottom") {
      insertIndex = targetIndex + 1;
    }

    newItems.splice(insertIndex, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);

    handleReorder(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetryAll = () => {
    setIsRetrying(true);
    setFeedbackMessage(null);
    setTimeout(() => {
      setIsRetrying(false);
      setFeedbackMessage("Retry dispatched safely. Zero duplicates guaranteed across student inboxes.");
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: "sent",
          statusDescription: "Delivered to student inbox",
          scheduledRetry: undefined,
          lastAttemptTime: "Just now",
        }))
      );
      if (onRetryNow) onRetryNow();
      setTimeout(() => setFeedbackMessage(null), 5000);
    }, 900);
  };

  const handleRetrySingle = (id: string) => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "sent",
                statusDescription: "Delivered to student inbox",
                scheduledRetry: undefined,
                lastAttemptTime: "Just now",
              }
            : item
        )
      );
      setFeedbackMessage("Recipient email resent successfully!");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }, 600);
  };

  const filteredLogs = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      item.recipientName.toLowerCase().includes(q) ||
      item.studentId.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "issues_only" && (item.status === "bounced" || item.status === "failed")) ||
      (statusFilter === "queued" && item.status === "queued") ||
      (statusFilter === "sent" && item.status === "sent");

    return matchesSearch && matchesStatus;
  });

  const isAllSelected =
    filteredLogs.length > 0 && selectedIds.length === filteredLogs.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredLogs.length;

  return (
    <div className="flex flex-col gap-4 w-full font-sans">
      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-[9px] bg-green-soft border border-green-border flex items-center justify-between text-xs text-green font-medium animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} weight="bold" className="shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-green hover:underline cursor-pointer font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar: Search, Filters & Quick Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, ID, or email..."
            className="pl-9 h-9 text-xs bg-card rounded-[8px] border-line font-sans"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="inline-flex rounded-[8px] border border-line p-0.5 bg-canvas/60 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "all"
                  ? "bg-card text-ink font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("issues_only")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "issues_only"
                  ? "bg-card text-red font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Issues ({items.filter((d) => d.status === "bounced" || d.status === "failed").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("queued")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "queued"
                  ? "bg-card text-amber font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              In Queue ({items.filter((d) => d.status === "queued").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("sent")}
              className={cn(
                "px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer font-display text-xs",
                statusFilter === "sent"
                  ? "bg-card text-green font-bold shadow-xs"
                  : "text-muted hover:text-ink"
              )}
            >
              Delivered ({items.filter((d) => d.status === "sent").length})
            </button>
          </div>

          <Button
            type="button"
            onClick={handleRetryAll}
            disabled={isRetrying}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-8.5 px-3.5 gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <ArrowClockwise size={14} className={cn(isRetrying && "animate-spin")} weight="bold" />
            <span>{isRetrying ? "Retrying..." : "Retry Issues"}</span>
          </Button>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-cyan-soft/40 border border-cyan-border rounded-[10px] flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-ink font-medium">
            <span className="font-bold text-cyan">{selectedIds.length}</span>
            <span>records selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleRetryAll}
              disabled={isRetrying}
              className="h-7.5 bg-cyan hover:bg-cyan-hover text-white rounded-[6px] px-3 text-xs gap-1 cursor-pointer font-semibold shadow-2xs"
            >
              <ArrowClockwise size={13} className={cn(isRetrying && "animate-spin")} weight="bold" />
              <span>Retry Selected ({selectedIds.length})</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-7.5 text-xs text-muted hover:text-ink rounded-[6px] px-2 cursor-pointer"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Rich Table with Separated Provider and Date & Time Columns */}
      <div
        ref={wrap}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIndex(null)}
        className={cn(
          "relative rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden",
          className
        )}
      >
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
              {/* Checkbox & Drag Header */}
              <TableHead className="w-14 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-6" aria-hidden="true" />
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all delivery records"
                  />
                </div>
              </TableHead>

              {/* Recipient */}
              <TableHead className="w-[26%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                Student Recipient
              </TableHead>

              {/* Diagnosis & Error Reason */}
              <TableHead className="w-[24%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                Diagnosis & Reason
              </TableHead>

              {/* Separated Column 1: Provider with Logo */}
              <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                Provider
              </TableHead>

              {/* Separated Column 2: Date & Time */}
              <TableHead className="w-[15%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                Date & Time
              </TableHead>

              {/* Status */}
              <TableHead className="w-[11%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
                Status
              </TableHead>

              {/* Action */}
              <TableHead className="w-[10%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLogs.map((log, index) => {
              const isSelected = selectedIds.includes(log.id);
              const isBeingDragged = draggedIndex === index;
              const isOverTarget = dragOverIndex === index;
              const isHovered = hoverIndex === index;
              const accent = STATUS_ACCENTS[log.status] || STATUS_ACCENTS.sent;
              const StatusIcon = accent.icon;

              const datePart = log.lastAttemptTime.includes(",")
                ? log.lastAttemptTime.split(",")[0].trim()
                : log.lastAttemptTime;
              const timePart = log.lastAttemptTime.includes(",")
                ? log.lastAttemptTime.split(",")[1].trim()
                : "";

              return (
                <TableRow
                  key={log.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "group transition-all duration-150 border-l-[4px]",
                    accent.borderLeftClass,
                    isSelected && "bg-cyan-soft/30 hover:bg-cyan-soft/40",
                    !isSelected && isHovered && "bg-canvas/50",
                    isBeingDragged && "opacity-40 bg-cyan-soft/20 scale-[0.99] shadow-sm",
                    isOverTarget && dropPosition === "top" && "border-t-2 border-t-cyan",
                    isOverTarget && dropPosition === "bottom" && "border-b-2 border-b-cyan"
                  )}
                >
                  {/* Drag Grip + Selection Checkbox */}
                  <TableCell
                    className="pl-3 py-3.5"
                    onPointerEnter={() => setHoverIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        tabIndex={0}
                        className="flex items-center justify-center size-6 rounded-[4px] text-muted-light hover:text-ink hover:bg-canvas cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to rearrange diagnostic row"
                        aria-label={`Drag to rearrange ${log.recipientName}`}
                      >
                        <DotsSixVertical size={16} weight="bold" />
                      </button>

                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(log.id)}
                        aria-label={`Select ${log.recipientName}`}
                      />
                    </div>
                  </TableCell>

                  {/* Student Recipient Column (Triggers Hover Preview) */}
                  <TableCell
                    className="truncate py-3.5 cursor-pointer"
                    onPointerEnter={() => {
                      if (draggedIndex === null) setHoverIndex(index);
                    }}
                    onPointerLeave={() => setHoverIndex(null)}
                  >
                    <div className="flex items-center gap-3 max-w-[95%]">
                      <ProfileCircle name={log.recipientName} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-sans text-sm font-bold text-ink group-hover:text-cyan transition-colors truncate">
                          {log.recipientName}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                          <span className="font-mono text-muted-light font-medium shrink-0">
                            {log.studentId}
                          </span>
                          <span className="text-muted-light shrink-0">·</span>
                          <span className="truncate">{log.email}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Diagnosis & Reason Column */}
                  <TableCell
                    className="py-3.5"
                    onPointerEnter={() => {
                      if (draggedIndex === null) setHoverIndex(index);
                    }}
                    onPointerLeave={() => setHoverIndex(null)}
                  >
                    <div className="flex flex-col gap-1 max-w-[95%]">
                      <span className="text-xs font-semibold text-ink font-sans leading-snug">
                        {log.statusDescription}
                      </span>
                      {log.scheduledRetry && (
                        <div className="flex items-center gap-1 text-[11px] text-amber font-medium">
                          <Clock size={12} weight="bold" className="shrink-0" />
                          <span>Retry: {log.scheduledRetry}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Separated Column 1: Provider with Logo */}
                  <TableCell
                    className="py-3.5"
                    onPointerEnter={() => setHoverIndex(null)}
                  >
                    <ProviderBadge provider={log.provider} messageId={log.messageId} />
                  </TableCell>

                  {/* Separated Column 2: Date & Time */}
                  <TableCell
                    className="py-3.5"
                    onPointerEnter={() => setHoverIndex(null)}
                  >
                    <div className="flex flex-col gap-0.5 font-sans">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <CalendarBlank size={13} className="shrink-0 text-muted" />
                        <span>{datePart}</span>
                      </div>
                      {timePart && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted">
                          <Clock size={12} className="shrink-0 text-muted-light" />
                          <span>{timePart}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Delivery Status Column */}
                  <TableCell
                    className="py-3.5"
                    onPointerEnter={() => setHoverIndex(null)}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                        accent.badgeBg
                      )}
                    >
                      <StatusIcon
                        size={13}
                        weight="bold"
                        className={cn(log.status === "queued" && "animate-pulse")}
                      />
                      <span>{accent.label}</span>
                    </span>
                  </TableCell>

                  {/* Row Actions */}
                  <TableCell
                    className="text-right pr-4 py-3.5"
                    onPointerEnter={() => setHoverIndex(null)}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {log.status === "bounced" || log.status === "failed" || log.status === "queued" ? (
                        <Button
                          size="sm"
                          onClick={() => handleRetrySingle(log.id)}
                          className="h-8 gap-1 rounded-full bg-cyan hover:bg-cyan-hover px-3 text-xs font-sans font-semibold text-white shadow-xs cursor-pointer"
                          title="Retry dispatching this recipient"
                        >
                          <ArrowClockwise size={13} weight="bold" />
                          <span>Retry</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetrySingle(log.id)}
                          className="h-8 gap-1 rounded-full border-line px-3 text-xs font-sans font-semibold text-ink hover:bg-canvas cursor-pointer shadow-2xs"
                          title="Inspect diagnostic log"
                        >
                          <Eye size={13} weight="bold" />
                          <span>Inspect</span>
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                            aria-label="Diagnostic options"
                          >
                            <DotsThreeVertical size={18} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 font-sans">
                          <DropdownMenuItem
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="text-xs cursor-pointer"
                          >
                            <ArrowUp size={15} className="mr-2 text-muted" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveDown(index)}
                            disabled={index === items.length - 1}
                            className="text-xs cursor-pointer"
                          >
                            <ArrowDown size={15} className="mr-2 text-muted" />
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRetrySingle(log.id)}
                            className="text-xs cursor-pointer"
                          >
                            <ArrowClockwise size={15} className="mr-2 text-cyan" />
                            Retry Now
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCopyText(log.email, `email_${log.id}`)}
                            className="text-xs cursor-pointer"
                          >
                            {copiedId === `email_${log.id}` ? (
                              <Check size={15} className="mr-2 text-green" />
                            ) : (
                              <Copy size={15} className="mr-2 text-muted" />
                            )}
                            Copy Email Address
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyText(log.studentId, `id_${log.id}`)}
                            className="text-xs cursor-pointer"
                          >
                            {copiedId === `id_${log.id}` ? (
                              <Check size={15} className="mr-2 text-green" />
                            ) : (
                              <Copy size={15} className="mr-2 text-muted" />
                            )}
                            Copy Student ID
                          </DropdownMenuItem>
                          {log.messageId && (
                            <DropdownMenuItem
                              onClick={() => handleCopyText(log.messageId!, `msg_${log.id}`)}
                              className="text-xs cursor-pointer"
                            >
                              {copiedId === `msg_${log.id}` ? (
                                <Check size={15} className="mr-2 text-green" />
                              ) : (
                                <Copy size={15} className="mr-2 text-muted" />
                              )}
                              Copy Provider Ref
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Floating Diagnostic Card Preview (Mouse following with spring physics) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 w-[280px] overflow-hidden rounded-[14px] border border-line bg-card shadow-2xl"
          style={{
            left: 0,
            top: 0,
            boxShadow:
              "0 20px 40px -10px rgba(18, 51, 58, 0.28), 0 0 0 1px var(--line)",
          }}
          animate={{
            x: Math.max(
              12,
              Math.min(pos.x + 24, (wrap.current?.clientWidth ?? 800) - 292)
            ),
            y: Math.max(
              10,
              Math.min(pos.y - 80, (wrap.current?.clientHeight ?? 500) - 220)
            ),
            opacity: hoverIndex !== null && draggedIndex === null ? 1 : 0,
            scale: hoverIndex !== null && draggedIndex === null ? 1 : 0.95,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 280,
                  damping: 26,
                  opacity: { duration: 0.18, ease: EASE },
                }
          }
        >
          {items.map((r, i) => {
            const isCurrent = hoverIndex === i;
            const currentAccent = STATUS_ACCENTS[r.status] || STATUS_ACCENTS.sent;
            const CurrentStatusIcon = currentAccent.icon;

            return (
              <div
                key={r.id || r.recipientName}
                aria-hidden="true"
                className="relative w-full"
                style={{ display: isCurrent ? "block" : "none" }}
              >
                {/* Header */}
                <div className="bg-ink p-3 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-cyan-soft font-bold font-display block">
                      Diagnostic Audit
                    </span>
                    <h5 className="font-display font-bold text-xs text-white truncate max-w-[190px]">
                      {r.recipientName}
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-soft">
                    {r.provider}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3.5 bg-paper flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-ink font-sans">
                      {r.statusDescription}
                    </span>
                    <div className="text-[11px] text-muted flex items-center justify-between font-mono pt-1 border-t border-line-subtle">
                      <span>ID: {r.studentId}</span>
                      <span>{r.messageId || "Ref Pending"}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-line-subtle flex items-center justify-between text-[10px] text-muted">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border",
                        currentAccent.badgeBg
                      )}
                    >
                      <CurrentStatusIcon size={11} weight="bold" />
                      <span>{currentAccent.label}</span>
                    </span>

                    <span className="flex items-center gap-1 text-[9.5px] text-green font-semibold">
                      <ShieldCheck size={12} weight="bold" />
                      Idempotent
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

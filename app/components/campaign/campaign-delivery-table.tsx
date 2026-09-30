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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import { StudentRecipient } from "./campaign-types";
import {
  DotsThreeVertical,
  DotsSixVertical,
  QrCode,
  Eye,
  CheckCircle,
  Clock,
  WarningCircle,
  ShieldCheck,
  ArrowClockwise,
  Copy,
  CalendarBlank,
  ArrowUp,
  ArrowDown,
  EnvelopeSimple,
  Check,
  PaperPlaneTilt,
  Lightning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface CampaignDeliveryTableProps {
  recipients: StudentRecipient[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onReorder?: (items: StudentRecipient[]) => void;
  onResend?: (studentId: string) => void;
  onViewPass?: (student: StudentRecipient) => void;
  eventName?: string;
  venue?: string;
  eventDate?: string;
  className?: string;
}

// Status accent configuration matching DESIGN.md color palette
const STATUS_ACCENTS: Record<
  StudentRecipient["deliveryStatus"],
  {
    borderLeftClass: string;
    label: string;
    badgeBg: string;
    icon: React.ElementType;
  }
> = {
  delivered: {
    borderLeftClass: "border-l-green",
    label: "Delivered",
    badgeBg: "bg-green-soft text-green border-green-border",
    icon: CheckCircle,
  },
  sending: {
    borderLeftClass: "border-l-cyan",
    label: "Sending",
    badgeBg: "bg-cyan-soft text-cyan border-cyan-border",
    icon: Clock,
  },
  invalid_email: {
    borderLeftClass: "border-l-red",
    label: "Needs Help",
    badgeBg: "bg-red-soft text-red border-red-border",
    icon: WarningCircle,
  },
  already_received: {
    borderLeftClass: "border-l-muted-light",
    label: "Protected",
    badgeBg: "bg-canvas text-muted border-line",
    icon: ShieldCheck,
  },
};

// Course badge styling strictly locked to BSIT, BSCS, and BSINS using DESIGN.md tokens
const COURSE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  BSIT: {
    bg: "bg-linear-to-r from-cyan-soft via-cyan-soft/80 to-cyan-soft/40",
    text: "text-cyan",
    border: "border-cyan-border",
  },
  BSCS: {
    bg: "bg-linear-to-r from-green-soft via-green-soft/80 to-green-soft/40",
    text: "text-green",
    border: "border-green-border",
  },
  BSINS: {
    bg: "bg-linear-to-r from-amber-soft via-amber-soft/80 to-amber-soft/40",
    text: "text-amber",
    border: "border-amber-border",
  },
};

function TableProviderBadge({
  provider = "Mailgun",
  messageId,
}: {
  provider?: "Mailgun" | "Brevo" | string;
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

export function CampaignDeliveryTable({
  recipients,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onReorder,
  onResend,
  onViewPass,
  eventName = "UMak SIC General Assembly",
  venue = "Audio Visual Room",
  eventDate = "17 Oct 2026 · 2:00 PM",
  className,
}: CampaignDeliveryTableProps) {
  const reduced = useReducedMotion();
  const wrap = React.useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [bounds, setBounds] = React.useState({ width: 800, height: 500 });
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Local list state to support immediate responsive reordering
  const [prevRecipients, setPrevRecipients] = React.useState(recipients);
  const [items, setItems] = React.useState<StudentRecipient[]>(recipients);

  if (prevRecipients !== recipients) {
    setPrevRecipients(recipients);
    setItems(recipients);
  }

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) {
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      setBounds({ width: r.width, height: r.height });
    }
  };

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"top" | "bottom" | null>(null);

  const isAllSelected =
    items.length > 0 && selectedIds.length === items.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  const handleReorder = (newItems: StudentRecipient[]) => {
    setItems(newItems);
    onReorder?.(newItems);
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-line bg-card py-16 px-4 text-center shadow-2xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
          <EnvelopeSimple size={24} weight="bold" />
        </div>
        <h3 className="font-display text-base font-bold text-ink">
          No delivery records found
        </h3>
        <p className="mt-1 font-sans text-xs text-muted max-w-sm">
          No student records match your current search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      onPointerMove={onMove}
      onPointerLeave={() => setHoverIndex(null)}
      className={cn(
        "relative rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[740px] table-fixed">
          <TableHeader>
          <TableRow className="bg-canvas/50 hover:bg-canvas/50 border-b border-line">
            {/* Checkbox & Reorder Header */}
            <TableHead className="w-14 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="w-6" aria-hidden="true" />
                {onToggleSelectAll && (
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all students"
                  />
                )}
              </div>
            </TableHead>

            {/* Student Column */}
            <TableHead className="w-[24%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Student Recipient
            </TableHead>

            {/* Course Column */}
            <TableHead className="w-[12%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Course
            </TableHead>

            {/* Separated Column 1: Provider with Logo */}
            <TableHead className="w-[14%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Provider
            </TableHead>

            {/* Separated Column 2: Date & Time */}
            <TableHead className="w-[15%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Date & Time
            </TableHead>

            {/* Delivery Status Column */}
            <TableHead className="w-[13%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Status
            </TableHead>

            {/* Ticket Pass Column */}
            <TableHead className="w-[10%] font-sans font-bold text-xs uppercase tracking-wider text-muted">
              Ticket Pass
            </TableHead>

            {/* Row Actions Header */}
            <TableHead className="w-[12%] font-sans font-bold text-xs uppercase tracking-wider text-muted text-right pr-4">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((student, index) => {
            const isSelected = selectedIds.includes(student.id);
            const isBeingDragged = draggedIndex === index;
            const isOverTarget = dragOverIndex === index;
            const isHovered = hoverIndex === index;
            const accent = STATUS_ACCENTS[student.deliveryStatus] || STATUS_ACCENTS.delivered;
            const StatusIcon = accent.icon;
            const courseStyle = student.course && COURSE_BADGES[student.course] ? COURSE_BADGES[student.course] : COURSE_BADGES.BSIT;

            const datePart = student.deliveredAt
              ? student.deliveredAt.split(",")[0].trim()
              : "In queue";
            const timePart = student.deliveredAt && student.deliveredAt.includes(",")
              ? student.deliveredAt.split(",")[1].trim()
              : "";

            return (
              <TableRow
                key={student.id}
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
                      title="Drag to rearrange student row"
                      aria-label={`Drag to rearrange ${student.name}`}
                    >
                      <DotsSixVertical size={16} weight="bold" />
                    </button>

                    {onToggleSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(student.id)}
                        aria-label={`Select ${student.name}`}
                      />
                    )}
                  </div>
                </TableCell>

                {/* Student Recipient Info (Triggers Hover Preview) */}
                <TableCell
                  className="truncate py-3.5 cursor-pointer"
                  onPointerEnter={() => {
                    if (draggedIndex === null) setHoverIndex(index);
                  }}
                  onPointerLeave={() => setHoverIndex(null)}
                >
                  <div className="flex items-center gap-3 max-w-[95%]">
                    <ProfileCircle name={student.name} size="md" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans text-sm font-bold text-ink group-hover:text-cyan transition-colors truncate">
                        {student.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                        <span className="font-mono text-muted-light font-medium shrink-0">
                          {student.studentId}
                        </span>
                        <span className="text-muted-light shrink-0">·</span>
                        <span className="truncate">{student.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Course Track Column */}
                <TableCell
                  className="py-3.5"
                  onPointerEnter={() => {
                    if (draggedIndex === null) setHoverIndex(index);
                  }}
                  onPointerLeave={() => setHoverIndex(null)}
                >
                  <div className="flex flex-col gap-1 max-w-[95%]">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full border shadow-none",
                          courseStyle.bg,
                          courseStyle.text,
                          courseStyle.border
                        )}
                      >
                        {student.course || "BSIT"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted font-sans truncate">
                      {student.program || "Information Technology"}
                    </span>
                  </div>
                </TableCell>

                {/* Separated Column 1: Provider with Logo */}
                <TableCell
                  className="py-3.5"
                  onPointerEnter={() => setHoverIndex(null)}
                >
                  <TableProviderBadge
                    provider={student.provider || "Mailgun"}
                    messageId={student.messageId}
                  />
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
                    {timePart ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted">
                        <Clock size={12} className="shrink-0 text-muted-light" />
                        <span>{timePart}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-light">Scheduled</span>
                    )}
                  </div>
                </TableCell>

                {/* Delivery Status Column */}
                <TableCell
                  className="py-3.5"
                  onPointerEnter={() => setHoverIndex(null)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                          accent.badgeBg
                        )}
                      >
                        <StatusIcon
                          size={13}
                          weight="bold"
                          className={cn(student.deliveryStatus === "sending" && "animate-spin")}
                        />
                        <span>{accent.label}</span>
                      </span>
                    </div>
                    {student.statusNote && (
                      <span className="text-[10.5px] text-muted truncate max-w-[150px] font-sans">
                        {student.statusNote}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Ticket Pass Column */}
                <TableCell
                  className="py-3.5"
                  onPointerEnter={() => setHoverIndex(null)}
                >
                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-light bg-canvas px-2 py-0.5 rounded-[4px] border border-line">
                    <QrCode size={12} className="text-cyan" />
                    {student.ticketCode || `PASS-${student.studentId.replace("-", "")}`}
                  </span>
                </TableCell>

                {/* Row Actions */}
                <TableCell
                  className="text-right pr-4 py-3.5"
                  onPointerEnter={() => setHoverIndex(null)}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {student.deliveryStatus === "invalid_email" || student.deliveryStatus === "sending" ? (
                      <Button
                        size="sm"
                        onClick={() => onResend?.(student.id)}
                        className="h-8 gap-1 rounded-full bg-cyan hover:bg-cyan-hover px-3 text-xs font-sans font-semibold text-white shadow-xs cursor-pointer"
                        title="Resend email to student"
                      >
                        <ArrowClockwise size={13} weight="bold" />
                        <span>Resend</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewPass?.(student)}
                        className="h-8 gap-1 rounded-full border-line px-3 text-xs font-sans font-semibold text-ink hover:bg-canvas cursor-pointer shadow-2xs"
                        title="Inspect ticket pass"
                      >
                        <Eye size={13} weight="bold" />
                        <span>View Pass</span>
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                          aria-label="Delivery options"
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
                          onClick={() => onViewPass?.(student)}
                          className="text-xs cursor-pointer"
                        >
                          <Eye size={15} className="mr-2 text-muted" />
                          View Ticket Pass
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onResend?.(student.id)}
                          className="text-xs cursor-pointer"
                        >
                          <ArrowClockwise size={15} className="mr-2 text-cyan" />
                          Resend Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleCopyText(student.email, `email_${student.id}`)}
                          className="text-xs cursor-pointer"
                        >
                          {copiedId === `email_${student.id}` ? (
                            <Check size={15} className="mr-2 text-green" />
                          ) : (
                            <Copy size={15} className="mr-2 text-muted" />
                          )}
                          Copy Email Address
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCopyText(student.studentId, `id_${student.id}`)}
                          className="text-xs cursor-pointer"
                        >
                          {copiedId === `id_${student.id}` ? (
                            <Check size={15} className="mr-2 text-green" />
                          ) : (
                            <Copy size={15} className="mr-2 text-muted" />
                          )}
                          Copy Student ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Floating Ticket Pass Preview - alive while a student row is hovered */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute z-30 hidden md:block w-[270px] overflow-hidden rounded-[14px] border border-line bg-card shadow-2xl"
        style={{
          left: 0,
          top: 0,
          boxShadow:
            "0 20px 40px -10px rgba(18, 51, 58, 0.28), 0 0 0 1px var(--line)",
        }}
        animate={{
          x: Math.max(
            12,
            Math.min(pos.x + 24, bounds.width - 282)
          ),
          y: Math.max(
            10,
            Math.min(pos.y - 80, bounds.height - 240)
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
          const currentAccent = STATUS_ACCENTS[r.deliveryStatus] || STATUS_ACCENTS.delivered;
          const CurrentStatusIcon = currentAccent.icon;

          return (
            <div
              key={r.id || r.name}
              aria-hidden="true"
              className="relative w-full"
              style={{ display: isCurrent ? "block" : "none" }}
            >
              {/* Ticket Mini Header */}
              <div className="bg-ink p-3 text-white flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-cyan-soft font-bold font-display block">
                    Official Pass Preview
                  </span>
                  <h5 className="font-display font-bold text-xs text-white truncate max-w-[180px]">
                    {eventName}
                  </h5>
                </div>
                <span className="text-[10px] font-mono text-cyan-soft">
                  {eventDate.split("·")[0] || "17 Oct"}
                </span>
              </div>

              {/* Ticket Body with QR Mock */}
              <div className="p-3.5 bg-paper flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="size-16 bg-card p-1 rounded-[6px] border border-line shrink-0 flex items-center justify-center">
                    <QrCode size={54} className="text-ink" weight="regular" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-display font-bold text-xs text-ink truncate">
                      {r.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted">
                      {r.studentId}
                    </span>
                    <span className="text-[10px] text-cyan font-bold font-sans mt-0.5">
                      {r.course || "BSIT"} · {venue}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[10px] text-muted">
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
                    Unique Pass
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

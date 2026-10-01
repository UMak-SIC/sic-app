"use client";

import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import {
  Users,
  CheckCircle,
  Check,
  X,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  CalendarBlank,
  Clock,
  MapPin,
  PaperPlaneTilt,
  DotsThreeVertical,
  EnvelopeSimple,
  QrCode,
  FloppyDisk,
} from "@phosphor-icons/react";
import { StudentRecipient } from "./campaign-types";
import { ProfileCircle } from "@/components/attendees/profile-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYAN = "var(--cyan)";
const GREEN = "var(--green)";
const MUTED = "var(--muted)";

export interface EventOption {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  status: "published" | "draft" | "closed";
  registeredCount: number;
  willReceiveCount: number;
  alreadyReceivedCount: number;
  capacity: number;
  image?: string;
  grad?: string;
}

export const AVAILABLE_EVENTS: EventOption[] = [
  {
    id: "evt_1",
    title: "UMak SIC General Assembly",
    venue: "Audio Visual Room, Admin Building",
    date: "Saturday, 17 Oct 2026",
    time: "2:00 PM - 4:00 PM",
    status: "published",
    registeredCount: 118,
    willReceiveCount: 114,
    alreadyReceivedCount: 4,
    capacity: 150,
    image: "/assets/events/event-ga.png",
    grad: "radial-gradient(120% 140% at 20% 10%, rgba(8,127,140,0.55), transparent 60%), linear-gradient(150deg, #12333a, var(--card))",
  },
  {
    id: "evt_2",
    title: "Intro to Cloud Computing",
    venue: "CCIS Lab 304",
    date: "Friday, 23 Oct 2026",
    time: "1:00 PM - 3:30 PM",
    status: "published",
    registeredCount: 48,
    willReceiveCount: 48,
    alreadyReceivedCount: 0,
    capacity: 60,
    image: "/assets/events/event-cloud.png",
    grad: "radial-gradient(120% 140% at 80% 15%, rgba(41,163,136,0.5), transparent 60%), linear-gradient(150deg, #102a24, var(--card))",
  },
  {
    id: "evt_3",
    title: "UI/UX Design Sprint",
    venue: "CCIS Multimedia Hall",
    date: "Wednesday, 28 Oct 2026",
    time: "9:00 AM - 12:00 PM",
    status: "published",
    registeredCount: 72,
    willReceiveCount: 70,
    alreadyReceivedCount: 2,
    capacity: 80,
    image: "/assets/events/event-design.png",
    grad: "radial-gradient(120% 140% at 30% 85%, rgba(217,141,43,0.5), transparent 60%), linear-gradient(150deg, #2b2010, var(--card))",
  },
  {
    id: "evt_4",
    title: "UMak Tech Summit 2026",
    venue: "Grand Auditorium",
    date: "Thursday, 05 Nov 2026",
    time: "8:00 AM - 5:00 PM",
    status: "draft",
    registeredCount: 0,
    willReceiveCount: 0,
    alreadyReceivedCount: 0,
    capacity: 350,
    image: "/assets/events/event-summit.png",
    grad: "radial-gradient(120% 140% at 70% 80%, rgba(34,184,201,0.5), transparent 60%), linear-gradient(150deg, #132e34, var(--card))",
  },
];

const EMPTY_EVENT: EventOption = {
  id: "",
  title: "No event selected",
  venue: "",
  date: "",
  time: "",
  status: "draft",
  registeredCount: 0,
  willReceiveCount: 0,
  alreadyReceivedCount: 0,
  capacity: 0,
};

const COURSE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  BSIT: { bg: "bg-cyan-soft/60", text: "text-cyan", border: "border-cyan-border/80" },
  BSCS: { bg: "bg-green-soft/60", text: "text-green", border: "border-green-border/80" },
  BSINS: { bg: "bg-amber-soft/60", text: "text-amber", border: "border-amber-border/80" },
  BSBA: { bg: "bg-cyan-soft/40", text: "text-ink", border: "border-line" },
  BSOA: { bg: "bg-canvas", text: "text-muted", border: "border-line" },
  BET: { bg: "bg-amber-soft/40", text: "text-amber", border: "border-amber-border/60" },
  ABComm: { bg: "bg-cyan-soft/30", text: "text-ink", border: "border-line" },
};

const SAMPLE_RECIPIENTS: StudentRecipient[] = [
  {
    id: "rec_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    college: "CCIS",
    course: "BSIT",
    program: "BS Information Technology",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    college: "CCIS",
    course: "BSCS",
    program: "BS Computer Science",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    college: "CCIS",
    course: "BSINS",
    program: "BS Information Systems",
    deliveryStatus: "already_received",
    statusNote: "Already received earlier reminder",
  },
  {
    id: "rec_4",
    name: "Joshua Ramos",
    studentId: "2022-01934",
    email: "joshua.ramos@umak.edu.ph",
    college: "CCIS",
    course: "BSIT",
    program: "BS Information Technology",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_5",
    name: "Patricia Reyes",
    studentId: "2023-00823",
    email: "patricia.reyes@umak.edu.ph",
    college: "CCIS",
    course: "BSCS",
    program: "BS Computer Science",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_6",
    name: "Christian Bautista",
    studentId: "2023-01044",
    email: "christian.bautista@umak.edu.ph",
    college: "CBFS",
    course: "BSBA",
    program: "BS Business Administration",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_7",
    name: "Mark Bautista",
    studentId: "2021-03412",
    email: "mark.bautista@umak.edu.ph",
    college: "CCIS",
    course: "BSCS",
    program: "BS Computer Science",
    deliveryStatus: "already_received",
    statusNote: "Already received earlier reminder",
  },
  {
    id: "rec_8",
    name: "Erika Mae Tan",
    studentId: "2023-01289",
    email: "erika.tan@umak.edu.ph",
    college: "CBFS",
    course: "BSOA",
    program: "BS Office Administration",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_9",
    name: "Rafael Mercado",
    studentId: "2023-01550",
    email: "rafael.mercado@umak.edu.ph",
    college: "CT",
    course: "BET",
    program: "Bachelor of Engineering Technology",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_10",
    name: "Chloe Lim",
    studentId: "2023-01129",
    email: "chloe.lim@umak.edu.ph",
    college: "CCIS",
    course: "BSIT",
    program: "BS Information Technology",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_11",
    name: "Daniel Tan",
    studentId: "2022-02104",
    email: "daniel.tan@umak.edu.ph",
    college: "CAL",
    course: "ABComm",
    program: "AB Broadcasting & Communication",
    deliveryStatus: "delivered",
  },
  {
    id: "rec_12",
    name: "Janelle Garcia",
    studentId: "2023-01822",
    email: "janelle.garcia@umak.edu.ph",
    college: "CAL",
    course: "ABComm",
    program: "AB Broadcasting & Communication",
    deliveryStatus: "already_received",
    statusNote: "Already received earlier reminder",
  },
];

// Sparkline Component for KPI Cards (campaign-kpi-row style)
const SPARK_W = 300;
const SPARK_H = 74;
const SPARK_TOP = 6;
const SPARK_BOT = 4;

function RecipientKpiSpark({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/:/g, "");

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1e-6, max - min);
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * SPARK_W;
  const y = (v: number) =>
    SPARK_TOP + (1 - (v - min) / span) * (SPARK_H - SPARK_TOP - SPARK_BOT);
  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");
  const area = `${line} L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z`;

  return (
    <div className="relative w-full overflow-hidden block">
      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        className="block w-full h-[76px]"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`kpi-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#kpi-${uid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.5, ease: EASE, delay: 0.2 }
          }
        />
        <motion.path
          d={line}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.8, ease: EASE }}
        />
      </svg>
    </div>
  );
}

// KPI Card Component
interface RecipientKpiCardProps {
  label: string;
  value: number;
  subLabel: string;
  deltaText: string;
  icon: React.ReactNode;
  color: string;
  sparkData: number[];
  delay: number;
}

function RecipientKpiCard({
  label,
  value,
  subLabel,
  deltaText,
  icon,
  color,
  sparkData,
  delay,
}: RecipientKpiCardProps) {
  const reduced = useReducedMotion();
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (reduced) return;
    const controls = animate(0, value, {
      duration: 1.0,
      delay,
      ease: EASE,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, delay, reduced]);

  const resolvedValue = reduced ? value : displayValue;

  return (
    <div className="relative flex-1 min-w-[240px] overflow-hidden rounded-[16px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-cyan/50 hover:shadow-sm">
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span aria-hidden="true" className="flex text-ink shrink-0">
              {icon}
            </span>
            <span className="text-xs font-semibold text-ink font-sans">
              {label}
            </span>
          </div>
          <span
            className={cn(
              "tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full",
              color === GREEN
                ? "bg-green-soft text-green"
                : color === CYAN
                ? "bg-cyan-soft text-cyan"
                : "bg-canvas text-muted border border-line"
            )}
          >
            {deltaText}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="tabular-nums text-3xl sm:text-4xl font-extrabold font-display text-ink tracking-tight"
            style={{ lineHeight: 1 }}
          >
            {resolvedValue}
          </span>
          <span className="text-xs text-muted font-sans font-medium">
            {subLabel}
          </span>
        </div>
      </div>

      <div className="w-full mt-2 overflow-hidden">
        <RecipientKpiSpark data={sparkData} color={color} />
      </div>
    </div>
  );
}

interface CampaignRecipientsStepProps {
  eventId?: string;
  eventName?: string;
  eventOptions?: EventOption[];
  recipients?: StudentRecipient[];
  onEventChange?: (eventId: string, eventName: string) => void;
  onContinue: (recipientIds: string[]) => void;
  onSaveDraft?: () => void;
}

export function CampaignRecipientsStep({
  eventId = "evt_1",
  eventName = "UMak SIC General Assembly",
  eventOptions = AVAILABLE_EVENTS,
  recipients = SAMPLE_RECIPIENTS,
  onEventChange,
  onContinue,
  onSaveDraft,
}: CampaignRecipientsStepProps) {
  const [selectedEventId, setSelectedEventId] = React.useState<string>(eventId);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<"all" | "will_receive" | "already_received">("all");
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [excludedIds, setExcludedIds] = React.useState<string[]>([]);

  // Find active event details
  const currentEvent =
    eventOptions.find((e) => e.id === selectedEventId) || eventOptions[0] || EMPTY_EVENT;

  const handleSelectEvent = (newId: string) => {
    setSelectedEventId(newId);
    const ev = eventOptions.find((e) => e.id === newId);
    if (ev && onEventChange) {
      onEventChange(ev.id, ev.title);
    }
  };

  const totalRegisteredCount = currentEvent.registeredCount;
  const alreadyReceivedCount = currentEvent.alreadyReceivedCount;
  const willReceiveCount = Math.max(0, currentEvent.willReceiveCount - excludedIds.length);

  // Recipient list filtering
  const filteredStudents = React.useMemo(() => {
    return recipients.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        student.name.toLowerCase().includes(q) ||
        student.studentId.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        (student.course && student.course.toLowerCase().includes(q));

      const isReadyToSend = student.deliveryStatus === "delivered";
      const matchesTab =
        filterTab === "all"
          ? true
          : filterTab === "will_receive"
          ? isReadyToSend && !excludedIds.includes(student.id)
          : student.deliveryStatus === "already_received" || excludedIds.includes(student.id);

      return matchesSearch && matchesTab;
    });
  }, [recipients, searchQuery, filterTab, excludedIds]);

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));
  const isSomeSelected =
    selectedStudentIds.length > 0 && !isAllSelected;

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleExcludeSelected = () => {
    setExcludedIds((prev) => Array.from(new Set([...prev, ...selectedStudentIds])));
    setSelectedStudentIds([]);
  };

  const handleIncludeSelected = () => {
    setExcludedIds((prev) => prev.filter((id) => !selectedStudentIds.includes(id)));
    setSelectedStudentIds([]);
  };

  const handleContinue = () => {
    onContinue(recipients.filter((recipient) => !excludedIds.includes(recipient.id)).map((recipient) => recipient.id));
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* 1. Header Card (Clean - 'Step 1 // Target Audience' badge removed) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-[12px] border border-line shadow-xs">
        <div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight">
            Choose Event & Review Students
          </h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Select which event&apos;s registered students will receive this announcement.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              className="text-xs font-semibold rounded-[6px] h-9 gap-1.5 cursor-pointer border-line"
            >
              <FloppyDisk size={14} weight="bold" className="text-muted" />
              <span>Save Draft</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={handleContinue}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 gap-1.5 cursor-pointer"
          >
            <span>Next: Write message</span>
            <ArrowRight size={14} weight="bold" />
          </Button>
        </div>
      </div>

      {/* 2. Rich Event Picker & Banner Card (Inspiration from events/page.tsx) */}
      <div className="bg-card rounded-[12px] border border-line p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarBlank size={18} weight="bold" className="text-cyan shrink-0" />
            <span className="text-xs font-display font-bold text-ink uppercase tracking-wider">
              Select Event
            </span>
          </div>

          <div className="w-full sm:w-80">
            <Select value={selectedEventId} onValueChange={handleSelectEvent}>
              <SelectTrigger className="h-10 text-xs bg-paper rounded-[6px] border-line font-medium text-ink w-full">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent className="bg-card border-line rounded-[9px]">
                {eventOptions.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id} className="text-xs py-2">
                    <span className="font-semibold text-ink">{ev.title}</span>
                    <span className="text-muted ml-1.5 font-sans">({ev.date.split(",")[1]?.trim() || ev.date})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Event Detail Hero Card */}
        <div className="relative overflow-hidden rounded-[12px] border border-line bg-canvas/40 grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Left / Top: Event Cover Image */}
          <div
            className="md:col-span-4 lg:col-span-3 min-h-[140px] md:min-h-[170px] relative overflow-hidden bg-canvas"
            style={{ background: currentEvent.grad }}
          >
            {currentEvent.image ? (
              <img
                src={currentEvent.image}
                alt={currentEvent.title}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center p-4">
                <span className="font-display font-bold text-ink/70 text-xs text-center">
                  {currentEvent.title}
                </span>
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full font-display font-bold text-[10px] uppercase tracking-wider backdrop-blur-xs",
                  currentEvent.status === "published"
                    ? "bg-green/90 text-white shadow-xs"
                    : "bg-amber/90 text-white shadow-xs"
                )}
              >
                {currentEvent.status === "published" ? "Published Event" : "Draft Event"}
              </span>
            </div>
          </div>

          {/* Right: Event Information Meta Strip */}
          <div className="md:col-span-8 lg:col-span-9 p-5 flex flex-col justify-between gap-3 bg-card/60">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-ink tracking-tight">
                {currentEvent.title}
              </h3>
              <p className="text-xs text-muted font-sans mt-0.5">
                Target roster automatically loaded from confirmed event registrations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line-subtle text-xs">
              <div className="flex items-start gap-2">
                <CalendarBlank size={16} weight="bold" className="text-cyan shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-muted text-[11px] font-sans">Date & Schedule</span>
                  <span className="font-semibold text-ink">{currentEvent.date}</span>
                  <span className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="shrink-0" />
                    {currentEvent.time}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={16} weight="bold" className="text-cyan shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-muted text-[11px] font-sans">Venue</span>
                  <span className="font-semibold text-ink">{currentEvent.venue}</span>
                  <span className="text-[11px] text-muted">Main Campus</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users size={16} weight="bold" className="text-cyan shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-muted text-[11px] font-sans">Event Capacity</span>
                  <span className="font-semibold text-ink font-display">
                    {totalRegisteredCount} / {currentEvent.capacity} registered
                  </span>
                  <span className="text-[11px] text-green font-medium">
                    {Math.round((totalRegisteredCount / currentEvent.capacity) * 100)}% filled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Three KPI Metric Cards (campaign-kpi-row style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <RecipientKpiCard
          label="Registered for event"
          value={totalRegisteredCount}
          subLabel="students"
          deltaText="Students on roster"
          icon={<Users size={18} weight="bold" />}
          color={CYAN}
          sparkData={[32, 45, 58, 70, 84, 96, 104, 110, 115, totalRegisteredCount]}
          delay={0}
        />

        <RecipientKpiCard
          label="Will receive email"
          value={willReceiveCount}
          subLabel="students"
          deltaText="Ready to send"
          icon={<PaperPlaneTilt size={18} weight="bold" />}
          color={GREEN}
          sparkData={[28, 40, 52, 65, 80, 92, 100, 106, 111, willReceiveCount]}
          delay={0.12}
        />

        <RecipientKpiCard
          label="Already received"
          value={alreadyReceivedCount}
          subLabel="students"
          deltaText="Skipped (no duplicates)"
          icon={<ShieldCheck size={18} weight="bold" />}
          color={MUTED}
          sparkData={[1, 2, 2, 3, 3, 4, 4, 4, 4, alreadyReceivedCount]}
          delay={0.24}
        />
      </div>

      {/* 4. Enhanced Recipient Roster Table (event-roster style) */}
      <div className="flex flex-col rounded-[12px] border border-line bg-card shadow-2xs overflow-hidden">
        {/* Roster Header Toolbar */}
        <div className="flex flex-col gap-3.5 border-b border-line-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink">
              Registered Student Recipients
            </h3>
            <span className="rounded-full bg-canvas px-2.5 py-0.5 font-sans text-xs font-semibold text-muted">
              {filteredStudents.length} {filteredStudents.length === 1 ? "student" : "students"}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              type="text"
              aria-label="Search recipients"
              placeholder="Search name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-line bg-card pl-8.5 pr-8 font-sans text-xs text-ink placeholder:text-muted-light focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs & Batch Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle px-4 py-2 bg-canvas/30">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
                filterTab === "all"
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink hover:bg-canvas"
              )}
            >
              All ({totalRegisteredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("will_receive")}
              className={cn(
                "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
                filterTab === "will_receive"
                  ? "bg-green text-white"
                  : "text-muted hover:text-green hover:bg-green-soft"
              )}
            >
              Will receive ({willReceiveCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("already_received")}
              className={cn(
                "rounded-full px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer",
                filterTab === "already_received"
                  ? "bg-muted text-paper"
                  : "text-muted hover:text-ink hover:bg-canvas"
              )}
            >
              Already sent ({alreadyReceivedCount})
            </button>
          </div>

          {/* Batch Action Bar */}
          {selectedStudentIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-medium text-ink">
                {selectedStudentIds.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExcludeSelected}
                className="h-7 rounded-full border-line text-xs font-sans text-red hover:bg-red-soft px-3 cursor-pointer"
              >
                Exclude from send
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleIncludeSelected}
                className="h-7 rounded-full border-line text-xs font-sans text-green hover:bg-green-soft px-3 cursor-pointer"
              >
                Include in send
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudentIds([])}
                className="h-7 rounded-full text-xs font-sans text-muted hover:text-ink px-2 cursor-pointer"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Table Content */}
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-canvas text-muted mb-3">
              <Users size={24} weight="bold" />
            </div>
            <h3 className="font-display text-sm font-bold text-ink">
              No recipients found
            </h3>
            <p className="mt-1 font-sans text-xs text-muted max-w-sm">
              No student records match your active search or filter criteria.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 font-sans text-xs font-semibold text-cyan underline-offset-4 hover:underline cursor-pointer"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="bg-canvas/50 border-b border-line text-muted font-sans font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="w-12 pl-4 py-3">
                    <Checkbox
                      checked={
                        isAllSelected
                          ? true
                          : isSomeSelected
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Select all students in view"
                    />
                  </th>
                  <th className="w-[42%] py-3 px-3">Student & Account</th>
                  <th className="w-[16%] py-3 px-3">Program</th>
                  <th className="w-[24%] py-3 px-3">Delivery Status</th>
                  <th className="w-[18%] py-3 px-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle font-sans">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isExcluded = excludedIds.includes(student.id);
                  const courseBadge = student.course
                    ? COURSE_BADGES[student.course] || COURSE_BADGES.BSIT
                    : COURSE_BADGES.BSIT;

                  const willReceiveThisEmail =
                    student.deliveryStatus === "delivered" && !isExcluded;

                  return (
                    <tr
                      key={student.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn(
                        "group transition-colors hover:bg-canvas/40",
                        isSelected && "bg-cyan-soft/30 hover:bg-cyan-soft/40"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="pl-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelectStudent(student.id)}
                          aria-label={`Select ${student.name}`}
                        />
                      </td>

                      {/* Profile Circle, Name, Student ID & Email */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3 min-w-0">
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
                      </td>

                      {/* Program Pill Badge Only */}
                      <td className="py-3 px-3">
                        {student.course ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2.5 py-0.5 text-[11px] font-bold rounded-full border shadow-none",
                              courseBadge.bg,
                              courseBadge.text,
                              courseBadge.border
                            )}
                          >
                            {student.course}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="px-2.5 py-0.5 text-[11px] font-bold rounded-full border border-line bg-canvas text-muted shadow-none"
                          >
                            General
                          </Badge>
                        )}
                      </td>

                      {/* Delivery Status Badge */}
                      <td className="py-3 px-3">
                        {willReceiveThisEmail ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-border bg-green-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-green">
                            <CheckCircle size={13} weight="bold" />
                            Will receive
                          </span>
                        ) : isExcluded ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 font-sans text-xs font-semibold text-amber">
                            <X size={13} weight="bold" />
                            Manually excluded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-0.5 font-sans text-xs font-semibold text-muted">
                            <Check size={13} weight="bold" />
                            Already received
                          </span>
                        )}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3 px-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isExcluded ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setExcludedIds((prev) =>
                                  prev.filter((id) => id !== student.id)
                                )
                              }
                              className="h-7 rounded-full border-line text-xs font-sans text-green hover:bg-green-soft px-2.5 cursor-pointer"
                            >
                              Re-include
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExcludedIds((prev) => [...prev, student.id])
                              }
                              className="h-7 rounded-full text-xs font-sans text-muted hover:text-red hover:bg-red-soft px-2 cursor-pointer"
                            >
                              Exclude
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-[6px] text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                                aria-label={`Options for ${student.name}`}
                              >
                                <DotsThreeVertical size={16} weight="bold" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 font-sans text-xs">
                              <DropdownMenuItem className="cursor-pointer">
                                <QrCode size={14} className="mr-2 text-cyan" />
                                View QR ticket pass
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <EnvelopeSimple size={14} className="mr-2 text-muted" />
                                View previous emails
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Plain Language Duplicate Protection Notice */}
      <div className="p-4 bg-green-soft border border-green-border rounded-[12px] text-xs text-ink flex items-start gap-3 shadow-2xs">
        <ShieldCheck size={20} className="text-green shrink-0 mt-0.5" weight="bold" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-green font-display text-sm block mb-0.5">
            Automatic Duplicate Protection Active
          </strong>
          <span>
            Students who already received this announcement will be safely skipped.
            No student will ever get duplicate emails or redundant notifications.
          </span>
        </div>
      </div>
    </div>
  );
}

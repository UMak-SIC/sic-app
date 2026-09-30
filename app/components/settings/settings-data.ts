import type { Icon } from "@phosphor-icons/react";
import { Archive, Clock, HardDrives, ShieldCheck } from "@phosphor-icons/react";

export type SystemTone = "green" | "cyan" | "amber" | "ink";

export interface SystemRuleCard {
  key: string;
  label: string;
  tone: SystemTone;
  badge: string;
  subtitle: string;
  icon: Icon;
  bullets: string[];
}

export const systemRuleCards: SystemRuleCard[] = [
  {
    key: "checkin-close",
    label: "1. Check-in closing",
    subtitle: "Automatic attendance deadline control",
    tone: "green",
    badge: "Automatic",
    icon: Clock,
    bullets: [
      "Opens two hours before the event starts.",
      "Closes two hours after the event ends.",
      "Everyone still waiting is marked absent when it closes.",
    ],
  },
  {
    key: "five-year-archiving",
    label: "2. Five-year archiving",
    subtitle: "Automated student privacy & data retention",
    tone: "cyan",
    badge: "5 years",
    icon: Archive,
    bullets: [
      "After five years, names, student numbers and email addresses are replaced with anonymous labels.",
      "Attendance times are rounded and email drafts are deleted.",
      "Each clean-up saves a short record of what it did.",
    ],
  },
  {
    key: "uploaded-files",
    label: "3. Uploaded files",
    subtitle: "Storage lifecycle & media asset retention",
    tone: "amber",
    badge: "5 years",
    icon: HardDrives,
    bullets: [
      "Files are kept for five years after the event.",
      "A file still in use cannot be deleted.",
      "Files go once every event and campaign using them is gone.",
    ],
  },
  {
    key: "who-has-access",
    label: "4. Who has access",
    subtitle: "Single-administrator authority security model",
    tone: "ink",
    badge: "1 administrator",
    icon: ShieldCheck,
    bullets: [
      "Exactly one administrator account can sign in.",
      "There is no self sign-up.",
      "No second administrator can be added from inside the app.",
    ],
  },
];

export const adminProfile = {
  name: "Charles Reyes",
  role: "Administrator",
  email: "admin@umak.edu.ph",
};

export const toneStyles: Record<
  SystemTone,
  {
    cardBg: string;
    iconBg: string;
    badge: string;
    bulletDot: string;
    glow: string;
  }
> = {
  green: {
    cardBg:
      "bg-gradient-to-br from-green-soft/90 via-paper to-paper border-green-border/80 hover:border-green-border hover:shadow-md",
    iconBg:
      "bg-gradient-to-br from-green-soft to-green-border/40 text-green-hover ring-1 ring-green-border/60 shadow-2xs",
    badge: "bg-green-soft text-green-hover border-green-border font-bold",
    bulletDot: "bg-green",
    glow: "bg-green/10",
  },
  cyan: {
    cardBg:
      "bg-gradient-to-br from-cyan-soft/90 via-paper to-paper border-cyan-border/80 hover:border-cyan-border hover:shadow-md",
    iconBg:
      "bg-gradient-to-br from-cyan-soft to-cyan-border/40 text-cyan ring-1 ring-cyan-border/60 shadow-2xs",
    badge: "bg-cyan-soft text-cyan border-cyan-border font-bold",
    bulletDot: "bg-cyan",
    glow: "bg-cyan/10",
  },
  amber: {
    cardBg:
      "bg-gradient-to-br from-amber-soft/90 via-paper to-paper border-amber-border/80 hover:border-amber-border hover:shadow-md",
    iconBg:
      "bg-gradient-to-br from-amber-soft to-amber-border/40 text-amber ring-1 ring-amber-border/60 shadow-2xs",
    badge: "bg-amber-soft text-amber border-amber-border font-bold",
    bulletDot: "bg-amber",
    glow: "bg-amber/10",
  },
  ink: {
    cardBg:
      "bg-gradient-to-br from-canvas/90 via-paper to-paper border-line hover:border-ink/40 hover:shadow-md",
    iconBg:
      "bg-gradient-to-br from-canvas to-line/50 text-ink ring-1 ring-line shadow-2xs",
    badge: "bg-canvas text-ink border-line font-bold",
    bulletDot: "bg-ink",
    glow: "bg-ink/10",
  },
};

import {
  SquaresFour,
  CalendarBlank,
  Users,
  Megaphone,
  FolderOpen,
  GearSix,
  ArrowsLeftRight,
  SignOut,
  type Icon,
} from "@phosphor-icons/react";

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  badge?: string;
  exact?: boolean;
  // Rendered as a button that runs the action instead of a link to href.
  action?: "sign-out";
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const sidebarNavSections: NavSection[] = [
  {
    title: "DASHBOARD",
    items: [
      {
        title: "Overview",
        href: "/ems/overview",
        icon: SquaresFour,
        exact: true,
      },
    ],
  },
  {
    title: "EVENT OPERATIONS",
    items: [
      {
        title: "Events",
        href: "/ems/events",
        icon: CalendarBlank,
      },
      {
        title: "Attendees",
        href: "/ems/attendees",
        icon: Users,
      },
    ],
  },
  {
    title: "OUTREACH",
    items: [
      {
        title: "Campaign",
        href: "/ems/campaign",
        icon: Megaphone,
      },
      {
        title: "Assets",
        href: "/ems/assets",
        icon: FolderOpen,
      },
    ],
  },
  {
    title: "GENERAL",
    items: [
      {
        title: "Settings",
        href: "/ems/settings",
        icon: GearSix,
      },
      {
        title: "Switch tool",
        href: "/",
        icon: ArrowsLeftRight,
        exact: true,
      },
      {
        title: "Logout",
        href: "/login",
        icon: SignOut,
        action: "sign-out",
      },
    ],
  },
];

import {
  SquaresFour,
  CalendarBlank,
  Users,
  Megaphone,
  FolderOpen,
  GearSix,
  SignOut,
  type Icon,
} from "@phosphor-icons/react";

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  badge?: string;
  exact?: boolean;
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
        href: "/overview",
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
        href: "/events",
        icon: CalendarBlank,
      },
      {
        title: "Attendees",
        href: "/attendees",
        icon: Users,
      },
    ],
  },
  {
    title: "OUTREACH",
    items: [
      {
        title: "Campaign",
        href: "/campaign",
        icon: Megaphone,
      },
      {
        title: "Assets",
        href: "/assets",
        icon: FolderOpen,
      },
    ],
  },
  {
    title: "GENERAL",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: GearSix,
      },
      {
        title: "Logout",
        href: "/login",
        icon: SignOut,
      },
    ],
  },
];

import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Megaphone,
  FolderKanban,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
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
        icon: LayoutDashboard,
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
        icon: CalendarDays,
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
        icon: FolderKanban,
      },
    ],
  },
  {
    title: "GENERAL",
    items: [
      {
        title: "Logout",
        href: "/logout",
        icon: LogOut,
      },
    ],
  },
];

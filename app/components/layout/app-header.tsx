"use client";

import * as React from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, List, X } from "@phosphor-icons/react";
import { useRouter, usePathname } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { MobileSidebarContent } from "./app-sidebar";

const authClient = createAuthClient();

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
  overview: "Overview",
  events: "Events",
  attendees: "Attendees",
  campaign: "Campaigns",
  campaigns: "Campaigns",
  assets: "Assets",
  settings: "Settings",
  checkin: "Check-in",
  analytics: "Analytics",
  edit: "Edit",
  responses: "Responses",
  templates: "Templates",
  compose: "Compose",
  members: "Members",
  forms: "Forms",
  newsletters: "Newsletters",
  reports: "Reports",
  logs: "Logs",
  feedback: "Feedback",
  certificates: "Certificates",
  organization: "Organization",
  users: "Users",
  shortener: "Link Shortener",
  unauthorized: "Unauthorized",
  login: "Sign In",
  register: "Sign Up",
};

function getSingularEntityName(parentSegment?: string): string {
  if (!parentSegment) return "Item";
  const parent = parentSegment.toLowerCase();
  if (parent === "events") return "Event";
  if (parent === "campaign" || parent === "campaigns") return "Campaign";
  if (parent === "attendees") return "Attendee";
  if (parent === "assets") return "Asset";
  if (parent === "forms") return "Form";
  if (parent === "members") return "Member";
  if (parent === "users") return "User";
  if (parent === "newsletters") return "Newsletter";
  if (parent === "reports") return "Report";
  if (parent === "certificates") return "Certificate";
  if (parent.endsWith("ies")) return parent.slice(0, -3) + "y";
  if (parent.endsWith("s")) return parent.slice(0, -1);
  return parent.charAt(0).toUpperCase() + parent.slice(1);
}

function isIdSegment(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  if (/^\d+$/.test(segment)) {
    return true;
  }
  if (/^[0-9a-f]{24}$/i.test(segment)) {
    return true;
  }
  if (/^[a-zA-Z0-9_-]{16,}$/.test(segment)) {
    return true;
  }
  return false;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "overview")) {
    return [{ label: "Overview", href: "/overview", isCurrent: true }];
  }

  const items: BreadcrumbItem[] = [];
  let accumulatedPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    accumulatedPath += `/${segment}`;
    const isLast = i === segments.length - 1;
    const parentSegment = i > 0 ? segments[i - 1] : undefined;

    let label: string;

    if (isIdSegment(segment)) {
      const entity = getSingularEntityName(parentSegment);
      label = `${entity} details`;
    } else if (segment.toLowerCase() === "new" && parentSegment) {
      const entity = getSingularEntityName(parentSegment);
      label = `New ${entity.toLowerCase()}`;
    } else if (SEGMENT_LABELS[segment.toLowerCase()]) {
      label = SEGMENT_LABELS[segment.toLowerCase()];
    } else {
      label = segment
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    }

    items.push({
      label,
      href: accumulatedPath,
      isCurrent: isLast,
    });
  }

  return items;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts[0].toUpperCase();
  }
  if (email && email.includes("@")) {
    const local = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    if (local.length >= 2) {
      return local.slice(0, 2).toUpperCase();
    }
    if (local.length === 1) {
      return (local + "A").toUpperCase();
    }
  }
  return "AD";
}

function abbreviateEmail(email?: string | null): string {
  if (!email) return "admin@umak.edu.ph";
  if (!email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 8) {
    return email;
  }
  return `${local.slice(0, 4)}...${local.slice(-2)}@${domain}`;
}

function formatDisplayName(name?: string | null, email?: string | null): string {
  if (name && name.trim()) return name.trim();
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    const formatted = local
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
    if (formatted) return formatted;
  }
  return "Administrator";
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const { data: session } = authClient.useSession();
  const rawEmail = session?.user?.email;
  const rawName = session?.user?.name;
  const avatarImage = session?.user?.image;

  const displayName = formatDisplayName(rawName, rawEmail);
  const displayEmail = abbreviateEmail(rawEmail);
  const fullEmail = rawEmail || "admin@umak.edu.ph";
  const initials = getInitials(rawName, rawEmail);

  const breadcrumbs = React.useMemo(() => getBreadcrumbs(pathname), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 md:px-8 bg-paper/90 backdrop-blur-md border-b border-line transition-colors">
        {/* Left: Hamburger (Mobile) + Navigation buttons and Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile Hamburger Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-[8px] bg-canvas text-ink hover:bg-surface-subtle-hover transition-colors shadow-2xs cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <List size={20} weight="bold" />
          </button>

          {/* Back/Forward buttons (hidden on mobile, visible on desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-muted hover:text-ink hover:bg-surface-subtle-hover transition-colors shadow-2xs cursor-pointer"
              aria-label="Go back"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              onClick={() => router.forward()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-muted hover:text-ink hover:bg-surface-subtle-hover transition-colors shadow-2xs cursor-pointer"
              aria-label="Go forward"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
            <ol className="flex items-center gap-1.5 text-sm sm:text-base min-w-0">
              {breadcrumbs.map((crumb, idx) => (
                <li key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {idx > 0 && (
                    <CaretRight
                      size={12}
                      weight="bold"
                      className="text-muted-light shrink-0 select-none"
                      aria-hidden="true"
                    />
                  )}
                  {crumb.isCurrent ? (
                    <span
                      aria-current="page"
                      className="font-sans font-bold text-ink tracking-tight truncate max-w-[180px] sm:max-w-none"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="font-sans font-medium text-muted hover:text-ink transition-colors truncate max-w-[120px] sm:max-w-none shrink-0"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Right: User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-green/20 shadow-xs">
            {avatarImage ? (
              <AvatarImage src={avatarImage} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-green to-[#176c59] text-white font-display font-bold text-xs sm:text-sm tracking-wider select-none">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col text-left min-w-0">
            <span className="text-xs sm:text-sm font-bold font-display text-ink leading-tight truncate max-w-[130px] sm:max-w-[170px]">
              {displayName}
            </span>
            <span
              title={fullEmail}
              className="hidden sm:inline text-xs text-muted font-sans leading-tight truncate max-w-[140px] sm:max-w-[180px]"
            >
              {displayEmail}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        {mobileNavOpen && (
          <DialogPortal>
            <DialogOverlay />
            <div className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-paper shadow-2xl animate-in slide-in-from-left duration-200 border-r border-line flex flex-col">
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-[6px] p-1.5 text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
              <MobileSidebarContent onClose={() => setMobileNavOpen(false)} />
            </div>
          </DialogPortal>
        )}
      </Dialog>
    </>
  );
}

/**
 * The ten public sections, in header order (PS-01.2). The header, footer and the
 * Home section links all read this list, and app/proxy.ts must exclude each
 * `href` (tests/proxy.test.ts checks it).
 */
export const PUBLIC_SECTIONS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/calendar", label: "Calendar" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/join", label: "Join Us" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
  { href: "/transparency", label: "Transparency" },
] as const;

/** Whether a path is inside a section, so the header can mark it (PS-01.7). */
export function isInSection(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
